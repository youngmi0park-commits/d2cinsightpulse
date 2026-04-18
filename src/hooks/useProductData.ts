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

// Shared data window — weekly first, fallback to 30d when too sparse
const WEEKLY_MIN_REVIEWS = 30;

export interface TrendingDataWindow {
  windowDays: 7 | 30;
  isFallback: boolean;
  weeklyCount: number;
}

// Fetch trending data window status (used by dashboard header badge)
export function useTrendingDataWindow() {
  return useQuery({
    queryKey: ["trending-data-window"],
    queryFn: async (): Promise<TrendingDataWindow> => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .gte("published_at", weekAgo);
      const weeklyCount = count || 0;
      const isFallback = weeklyCount < WEEKLY_MIN_REVIEWS;
      return { windowDays: isFallback ? 30 : 7, isFallback, weeklyCount };
    },
    staleTime: 60_000,
  });
}

// Aggregate trending products from reviews directly (published_at window)
export function useTrendingProducts(source?: string) {
  return useQuery({
    queryKey: ["trending-products-v2", source],
    queryFn: async () => {
      const fetchSince = async (sinceISO: string) => {
        let q = supabase
          .from("reviews")
          .select("product_id, sentiment, sentiment_score, source, products!inner(model_number, display_name, category, is_active)")
          .gte("published_at", sinceISO)
          .limit(2000);
        if (source) q = q.like("source", `${source}%`);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []).filter((r: any) => r.products?.is_active);
      };

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let rows = await fetchSince(weekAgo);
      if (rows.length < WEEKLY_MIN_REVIEWS) {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        rows = await fetchSince(monthAgo);
      }

      const agg: Record<string, { product: any; mentions: number; posScore: number; total: number }> = {};
      for (const r of rows) {
        const pid = (r as any).product_id as string;
        const prod = (r as any).products;
        if (!agg[pid]) agg[pid] = { product: prod, mentions: 0, posScore: 0, total: 0 };
        agg[pid].mentions++;
        if ((r as any).sentiment === "positive") agg[pid].posScore++;
        agg[pid].total++;
      }

      return Object.entries(agg)
        .map(([pid, v]) => ({
          productId: pid,
          rank: 0,
          modelNumber: v.product.model_number,
          displayName: v.product.display_name,
          category: v.product.category,
          mentions: v.mentions,
          sentimentScore: v.total > 0 ? Math.round((v.posScore / v.total) * 100) : 50,
          trend: "stable" as const,
          changePercent: 0,
        }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 10)
        .map((p, i) => ({ ...p, rank: i + 1 })) as (DBTrendingProduct & { productId: string })[];
    },
  });
}

// Fetch trending keywords from DB — latest snapshot_date only (extract-keywords already uses 7d window)
export function useTrendingKeywords(source?: string) {
  return useQuery({
    queryKey: ["trending-keywords", source],
    queryFn: async () => {
      const { data: latestRow } = await supabase
        .from("trending_keywords")
        .select("snapshot_date")
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestDate = latestRow?.snapshot_date;

      let query = supabase
        .from("trending_keywords")
        .select("*")
        .order("count", { ascending: false })
        .limit(30);

      if (latestDate) {
        query = query.eq("snapshot_date", latestDate);
      }
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
