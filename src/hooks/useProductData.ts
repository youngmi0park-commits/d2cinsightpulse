import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPrivacyRestricted, getSafeReviewText } from "@/lib/reviewUtils";

export interface DBReview {
  id: string;
  source: string;
  author: string | null;
  title: string | null;
  content: string;
  rating: number | null;
  sentiment: string | null;
  sentiment_score: number | null;
  published_at: string | null;
  collected_at: string;
  source_url: string | null;
}

export interface DBProduct {
  id: string;
  model_number: string;
  display_name: string;
  category: string;
  reviews: DBReview[];
}

export interface DBTrendingProduct {
  rank: number;
  modelNumber: string;
  displayName: string;
  category: string;
  mentions: number;
  sentimentScore: number;
  trend: "up" | "down" | "stable";
  changePercent: number;
}

export interface DBTrendingKeyword {
  keyword: string;
  count: number;
  sentiment: "positive" | "negative" | "neutral";
  change: number;
  source?: string;
  relatedProducts?: string[];
  relatedCountries?: string[];
}

// Search products with reviews from DB
export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ["search-products", query],
    queryFn: async () => {
      if (!query) return [];

      // Search products by model_number or display_name
      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .or(`model_number.ilike.%${query}%,display_name.ilike.%${query}%,category.ilike.%${query}%`)
        .eq("is_active", true);

      if (error) throw error;
      if (!products?.length) return [];

      // Fetch reviews for each product
      const results: DBProduct[] = [];
      for (const product of products) {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("*")
          .eq("product_id", product.id)
          .order("collected_at", { ascending: false })
          .limit(50);

        results.push({
          id: product.id,
          model_number: product.model_number,
          display_name: product.display_name,
          category: product.category,
          reviews: reviews || [],
        });
      }

      return results;
    },
    enabled: !!query,
  });
}

// Fetch trending products from DB
export function useTrendingProducts(source?: string) {
  return useQuery({
    queryKey: ["trending-products", source],
    queryFn: async () => {
      let query = supabase
        .from("trending_snapshots")
        .select("*, products!inner(model_number, display_name, category)")
        .order("mention_count", { ascending: false })
        .limit(10);

      if (source) {
        query = query.eq("source", source);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item: any, idx: number) => ({
        rank: item.rank || idx + 1,
        modelNumber: item.products.model_number,
        displayName: item.products.display_name,
        category: item.products.category,
        mentions: item.mention_count,
        sentimentScore: Math.round((item.avg_sentiment_score || 0.5) * 100),
        trend: (item.trend || "stable") as "up" | "down" | "stable",
        changePercent: Number(item.change_percent) || 0,
      })) as DBTrendingProduct[];
    },
  });
}

// Fetch trending keywords from DB
export function useTrendingKeywords(source?: string) {
  return useQuery({
    queryKey: ["trending-keywords", source],
    queryFn: async () => {
      let query = supabase
        .from("trending_keywords")
        .select("*")
        .order("count", { ascending: false })
        .limit(30);

      if (source) {
        query = query.eq("source", source);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item: any) => ({
        keyword: item.keyword,
        count: item.count,
        sentiment: item.sentiment as "positive" | "negative" | "neutral",
        change: Number(item.change_percent) || 0,
        source: item.source || "",
        relatedProducts: item.related_products || [],
        relatedCountries: item.related_countries || [],
      })) as DBTrendingKeyword[];
    },
  });
}

// Fetch review counts grouped by source (server-side aggregation)
export function useSourceCounts() {
  return useQuery({
    queryKey: ["source-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_source_counts");
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of (data || []) as { source: string; count: number }[]) {
        counts[row.source] = row.count;
      }
      return counts;
    },
    staleTime: 60_000,
  });
}

// Fetch review counts grouped by country
export function useCountryCounts() {
  return useQuery({
    queryKey: ["country-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_country_counts" as any);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of (data || []) as { country: string; count: number }[]) {
        counts[row.country] = row.count;
      }
      return counts;
    },
    staleTime: 60_000,
  });
}

// Fetch all products summary (for landing page stats)
export function useProductStats() {
  return useQuery({
    queryKey: ["product-stats"],
    queryFn: async () => {
      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      const { count: reviewCount } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true });

      const { data: latestLog } = await supabase
        .from("collection_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        productCount: productCount || 0,
        reviewCount: reviewCount || 0,
        lastCollection: latestLog,
      };
    },
  });
}

// Strip PII patterns from text (names, emails, phones, addresses)
function stripPII(text: string): string {
  return text
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    // Phone numbers (various formats)
    .replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[phone]")
    // Order / serial numbers that look like personal IDs
    .replace(/\b[A-Z]{2,3}-?\d{8,}\b/g, "[id]")
    // Names after "I'm" / "my name is" patterns
    .replace(/(?:I'?m|my name is|name:)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi, "[name]");
}

// Convert DB review to the format used by existing components
export function toReviewFormat(dbReview: DBReview) {
  const restricted = isPrivacyRestricted(dbReview.source);

  // For privacy-restricted sources: show sentiment summary, never raw text
  let displayText: string;
  if (restricted) {
    const sentLabel = dbReview.sentiment === "positive"
      ? "👍 긍정적 사용 경험 확인"
      : dbReview.sentiment === "negative"
        ? "👎 불만 또는 개선 요청 확인"
        : "➖ 중립적 의견";
    displayText = dbReview.title
      ? `${sentLabel} — ${dbReview.title}`
      : sentLabel;
  } else {
    displayText = dbReview.content;
  }

  return {
    id: dbReview.id,
    source: dbReview.source as any,
    author: restricted ? "LG.com User" : (dbReview.author || "Anonymous"),
    text: displayText,
    // Pass real content for internal analysis (never displayed directly)
    _analysisText: dbReview.content && dbReview.content.length > 20 ? dbReview.content : undefined,
    title: dbReview.title || undefined,
    date: dbReview.published_at?.split("T")[0] || dbReview.collected_at.split("T")[0],
    rating: restricted ? undefined : (dbReview.rating ?? undefined),
    sentiment: (dbReview.sentiment || "neutral") as "positive" | "negative" | "neutral",
    score: dbReview.sentiment_score ?? 0.5,
  };
}
