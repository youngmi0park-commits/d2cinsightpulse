import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WEEKLY_MIN_REVIEWS, getSinceISO } from "@/hooks/useProductData";
import { countryToSourceFilter } from "@/components/CountryFilterBar";

export type ExternalBadge = "ON" | "DEFEND" | "SEASON" | "WATCH" | "READY";

export interface ExternalChannelInsight {
  category: string;
  categoryKo: string;
  channel: string;
  channelKey: string;
  topSource: string;
  country: string;
  totalCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positivePct: number;
  negativePct: number;
  topPositiveKeywords: string[];
  topNegativeKeywords: string[];
  badge: ExternalBadge;
  insightText: string;
}

export interface ExternalChannelInsightsResult {
  insights: ExternalChannelInsight[];
  totalReviews: number;
  windowDays: 7 | 30;
  /** true when at least one external-channel review was collected in the window */
  hasExternalData: boolean;
  /** true when only lge_com reviews exist — prompts "LG.com 전용" notice */
  onlyLgComData: boolean;
}

const SEASIA = new Set(["TH", "VN", "SG", "MY", "ID", "PH"]);

const SOURCE_CHANNEL_LABEL: Record<string, string> = {
  trustpilot: "Trustpilot",
  reddit: "Reddit",
  youtube: "YouTube",
  amazon: "Amazon",
  bestbuy: "Best Buy",
  walmart: "Walmart",
  costco: "Costco",
  target: "Target",
  rtings: "RTINGS",
  pcmag: "PCMag",
  techradar: "TechRadar",
  soundguys: "SoundGuys",
  cnet: "CNET",
  houzz: "Houzz",
  shopee: "Shopee",
  lazada: "Lazada",
  consumer_reports: "Consumer Reports",
  consumeraffairs: "ConsumerAffairs",
  complaintsboard: "ComplaintsBoard",
  bestreviews: "BestReviews",
  reviews_io: "Reviews.io",
  notebookcheck: "Notebookcheck",
  lemon8: "Lemon8",
  web_review: "Web Review",
  trusted_reviews: "Trusted Reviews",
};

const CATEGORY_KO: Record<string, string> = {
  TV: "TV",
  Monitor: "모니터",
  Refrigerator: "냉장고",
  Washer: "세탁기",
  Dryer: "건조기",
  Dishwasher: "식기세척기",
  Kitchen: "주방가전",
  Vacuum: "청소기",
  "Air Conditioner": "에어컨",
  "Air Care": "공기청정기",
  "Air Purifier": "공기청정기",
  Soundbar: "사운드바",
  Audio: "오디오",
  Projector: "프로젝터",
  Laptop: "노트북",
  Styler: "스타일러",
  Microwave: "전자레인지",
  "Range/Oven": "오븐/레인지",
  Cooktop: "쿡탑",
  Dehumidifier: "제습기",
  General: "가전",
};

/** Map a raw source (e.g., "amazon_us", "reddit_lgoled") to a normalized channel key (e.g., "amazon", "reddit"). */
function normalizeChannelKey(source: string): string {
  const s = (source || "").toLowerCase();
  if (s.startsWith("lge_com")) return "lge_com";
  if (s.startsWith("amazon")) return "amazon";
  if (s.startsWith("youtube")) return "youtube";
  if (s.startsWith("shopee")) return "shopee";
  if (s.startsWith("lazada")) return "lazada";
  if (s.startsWith("reddit")) return "reddit";
  if (s.startsWith("bestbuy") || s === "best_buy") return "bestbuy";
  return s;
}

function inferCountryFromSource(source: string): string {
  const s = (source || "").toLowerCase();
  const m = s.match(/_(us|uk|ca|de|fr|au|br|mx|jp|sg|my|th|ph|id|vn|tw|hk|in)$/i);
  if (m) return m[1].toUpperCase();
  if (s === "reddit" || s.startsWith("reddit_")) return "Global";
  const global = ["trustpilot", "reviews_io", "complaintsboard", "pcmag", "rtings", "techradar", "soundguys", "cnet", "notebookcheck", "houzz", "lemon8"];
  if (global.includes(s)) return "Global";
  const usOnly = ["bestbuy", "walmart", "costco", "target", "consumeraffairs", "consumer_reports", "bestreviews"];
  if (usOnly.includes(s)) return "US";
  if (s === "trusted_reviews") return "UK";
  return "Global";
}

function channelLabel(channelKey: string, topSource: string): string {
  return (
    SOURCE_CHANNEL_LABEL[channelKey] ||
    SOURCE_CHANNEL_LABEL[topSource] ||
    (topSource || channelKey).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function classifyBadge(args: {
  positivePct: number;
  negativePct: number;
  totalCount: number;
  category: string;
  country: string;
}): ExternalBadge {
  const { positivePct, negativePct, totalCount, category, country } = args;
  if (totalCount < 10) return "READY";
  if (positivePct >= 80 && totalCount >= 30) return "ON";
  if (negativePct >= 40) return "DEFEND";
  const isAC = category === "Air Conditioner" || category === "AC";
  if (isAC && SEASIA.has(country)) return "SEASON";
  return "WATCH";
}

function buildInsightText(args: {
  badge: ExternalBadge;
  categoryKo: string;
  totalCount: number;
  positivePct: number;
  negativePct: number;
  topPositiveKeywords: string[];
  topNegativeKeywords: string[];
  channel: string;
  country: string;
}): string {
  const {
    badge, categoryKo, totalCount, positivePct, negativePct,
    topPositiveKeywords, topNegativeKeywords, channel, country,
  } = args;
  const base = `${totalCount}건 기반`;
  const topPos = topPositiveKeywords[0];
  const topNeg = topNegativeKeywords[0];

  if (badge === "READY") {
    return `⏳ ${categoryKo} — ${channel} 리뷰 수집 진행 중 (${base})`;
  }
  if (badge === "ON" || positivePct >= 80) {
    const kw = topPos ? `"${topPos}"` : "핵심 강점 포인트";
    return `✅ ${categoryKo} — ${kw} 중심 호평 (긍정 ${positivePct}% · ${base})`;
  }
  if (badge === "DEFEND" || positivePct < 60) {
    const kw = topNeg ? `"${topNeg}"` : "부정 피드백";
    return `⚠️ ${categoryKo} — ${kw} FAQ 대응 권고 (부정 ${negativePct}% · ${base})`;
  }
  if (badge === "SEASON") {
    const kw = topPos ? `"${topPos}"` : "성수기 수요";
    return `🌡️ ${categoryKo} — ${country} 성수기 진입, ${kw} 소재 선반영 (${base})`;
  }
  // WATCH (60–79% positive)
  const topic = topNeg || topPos || "주요 이슈";
  return `👀 ${categoryKo} — "${topic}" 모니터링 필요 (긍정 ${positivePct}% · ${base})`;
}

export function useExternalChannelInsights(params?: { country?: string; limit?: number }) {
  const country = params?.country ?? "all";
  const limit = params?.limit ?? 5;
  return useQuery<ExternalChannelInsightsResult>({
    queryKey: ["external-channel-insights", country, limit],
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const sourcesFilter = countryToSourceFilter(country)
        ?.filter((s) => !s.startsWith("lge_com"));

      const buildBase = () => {
        let q = supabase
          .from("reviews")
          .select(
            "source, sentiment, product_id, products!inner(category, is_active)",
            { count: "exact" }
          )
          .not("source", "like", "lge_com%")
          .limit(5000);
        if (sourcesFilter && sourcesFilter.length > 0) {
          q = q.in("source", sourcesFilter);
        }
        return q;
      };

      // Weekly first, 30-day fallback. Use collected_at (reddit, firecrawl sources often lack published_at).
      type Row = {
        source: string;
        sentiment: string | null;
        product_id: string;
        products: { category: string | null; is_active: boolean } | null;
      };
      const week = await buildBase().gte("collected_at", getSinceISO(7));
      if (week.error) throw week.error;
      let rows: Row[] = ((week.data as unknown as Row[]) || []).filter((r) => r.products?.is_active);
      let windowDays: 7 | 30 = 7;
      if ((week.count ?? rows.length) < WEEKLY_MIN_REVIEWS) {
        const month = await buildBase().gte("collected_at", getSinceISO(30));
        if (month.error) throw month.error;
        rows = ((month.data as unknown as Row[]) || []).filter((r) => r.products?.is_active);
        windowDays = 30;
      }

      // Detect "only LG.com data" by a single broader check — if no external rows at all in 30d,
      // check whether any lge_com rows exist.
      let onlyLgComData = false;
      if (rows.length === 0) {
        const { count: lgCount } = await supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .like("source", "lge_com%")
          .gte("collected_at", getSinceISO(30));
        onlyLgComData = (lgCount ?? 0) > 0;
      }

      // Fetch latest-snapshot trending_keywords for external sources (for top-keyword extraction).
      const { data: latestRow } = await supabase
        .from("trending_keywords")
        .select("snapshot_date")
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      const latestDate = latestRow?.snapshot_date;

      let kwRows: Array<{ source: string | null; keyword: string; sentiment: string; count: number }> = [];
      if (latestDate) {
        const { data: kw } = await supabase
          .from("trending_keywords")
          .select("source, keyword, sentiment, count")
          .eq("snapshot_date", latestDate)
          .not("source", "like", "lge_com%")
          .order("count", { ascending: false })
          .limit(1000);
        kwRows = (kw || []) as typeof kwRows;
      }

      // Aggregate rows by (category, normalized channelKey)
      type Bucket = {
        category: string;
        channelKey: string;
        sourceCounts: Record<string, number>;
        positive: number;
        negative: number;
        neutral: number;
        total: number;
      };
      const buckets: Record<string, Bucket> = {};
      for (const r of rows) {
        const cat = (r.products?.category as string) || "General";
        const channelKey = normalizeChannelKey(r.source || "");
        const key = `${cat}||${channelKey}`;
        if (!buckets[key]) {
          buckets[key] = {
            category: cat,
            channelKey,
            sourceCounts: {},
            positive: 0,
            negative: 0,
            neutral: 0,
            total: 0,
          };
        }
        const b = buckets[key];
        b.total++;
        if (r.sentiment === "positive") b.positive++;
        else if (r.sentiment === "negative") b.negative++;
        else b.neutral++;
        b.sourceCounts[r.source] = (b.sourceCounts[r.source] || 0) + 1;
      }

      const insights: ExternalChannelInsight[] = Object.values(buckets).map((b) => {
        const topSource = Object.entries(b.sourceCounts).sort((a, b2) => b2[1] - a[1])[0]?.[0] || "";
        const channel = channelLabel(b.channelKey, topSource);
        const countryCode = country !== "all" ? country : inferCountryFromSource(topSource);
        const nonNeutral = b.positive + b.negative;
        const positivePct = nonNeutral > 0 ? Math.round((b.positive / nonNeutral) * 100) : 0;
        const negativePct = nonNeutral > 0 ? Math.round((b.negative / nonNeutral) * 100) : 0;

        const topPositiveKeywords = kwRows
          .filter((k) => normalizeChannelKey(k.source || "") === b.channelKey && k.sentiment === "positive")
          .slice(0, 3)
          .map((k) => k.keyword);
        const topNegativeKeywords = kwRows
          .filter((k) => normalizeChannelKey(k.source || "") === b.channelKey && k.sentiment === "negative")
          .slice(0, 3)
          .map((k) => k.keyword);

        const categoryKo = CATEGORY_KO[b.category] || b.category || "가전";
        const badge = classifyBadge({
          positivePct,
          negativePct,
          totalCount: b.total,
          category: b.category,
          country: countryCode,
        });
        const insightText = buildInsightText({
          badge,
          categoryKo,
          totalCount: b.total,
          positivePct,
          negativePct,
          topPositiveKeywords,
          topNegativeKeywords,
          channel,
          country: countryCode,
        });

        return {
          category: b.category,
          categoryKo,
          channel,
          channelKey: b.channelKey,
          topSource,
          country: countryCode,
          totalCount: b.total,
          positiveCount: b.positive,
          negativeCount: b.negative,
          neutralCount: b.neutral,
          positivePct,
          negativePct,
          topPositiveKeywords,
          topNegativeKeywords,
          badge,
          insightText,
        };
      });

      // Priority: non-READY first, then higher volume, then stronger sentiment signal.
      insights.sort((a, b) => {
        const readyA = a.badge === "READY" ? 1 : 0;
        const readyB = b.badge === "READY" ? 1 : 0;
        if (readyA !== readyB) return readyA - readyB;
        return b.totalCount - a.totalCount;
      });

      return {
        insights: insights.slice(0, limit),
        totalReviews: rows.length,
        windowDays,
        hasExternalData: rows.length > 0,
        onlyLgComData,
      };
    },
  });
}
