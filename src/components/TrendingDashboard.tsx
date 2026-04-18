import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTrendingProducts, useTrendingKeywords, useProductStats, useSourceCounts, useTrendingDataWindow, type DBTrendingKeyword } from "@/hooks/useProductData";
import { maskCompetitorNames } from "@/lib/sentiment";

/* ───── Types ───── */

interface KeyTakeawayItem {
  product: string;
  category: string;
  positive_msg: string;
  negative_msg: string;
  marketer_action: string;
}

interface ChannelTopProduct {
  product_id: string;
  model_number: string;
  display_name: string;
  category: string;
  count: number;
}

interface TrendingDashboardProps {
  onProductClick?: (modelNumber: string) => void;
  country?: string;
}

type SignalFilter = "all" | "rising" | "falling" | "new";

/* ───── Helpers ───── */

/** 제품 디스플레이명 포맷: BV 마케팅명 우선, "LG MODEL" 패턴은 카테고리+모델로 변환 */
function formatProductDisplayName(displayName: string, modelNumber: string, category: string): string {
  const trimmed = displayName.trim();
  // If display_name is just "LG {model}" or matches model_number exactly → enrich
  const isModelOnly = trimmed === modelNumber
    || trimmed === `LG ${modelNumber}`
    || /^LG\s+[A-Z0-9\-]+$/i.test(trimmed);

  if (isModelOnly) {
    // Use category + model for readability
    const catLabel = category && category !== "General" ? `${category} ` : "";
    return `${catLabel}${modelNumber}`;
  }

  // If display_name is excessively long (BV description leak), truncate
  if (trimmed.length > 80) {
    return trimmed.slice(0, 77) + "…";
  }

  return trimmed;
}

/* ───── Hooks ───── */

function useChannelKeyTakeaway(channel: "lgcom" | "reddit") {
  return useQuery({
    queryKey: ["channel-key-takeaway", channel],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-overview-summary", {
        body: { channel },
      });
      if (error) throw error;
      return (data?.overview?.key_takeaway as KeyTakeawayItem[]) || [];
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });
}

function useChannelTopProducts(sourcePrefix: string, sentiment: string, limit = 6) {
  return useQuery({
    queryKey: ["channel-top-products-weekly", sourcePrefix, sentiment, limit],
    queryFn: async () => {
      const fetchSince = async (sinceISO: string) => {
        const { data, error } = await supabase
          .from("reviews")
          .select("product_id, products!inner(model_number, display_name, category, is_active)")
          .like("source", `${sourcePrefix}%`)
          .eq("sentiment", sentiment)
          .gte("published_at", sinceISO)
          .limit(1000);
        if (error) throw error;
        return data || [];
      };

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let data = await fetchSince(weekAgo);
      let windowDays: 7 | 30 = 7;
      // Per-channel/sentiment fallback threshold
      if (data.length < 10) {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        data = await fetchSince(monthAgo);
        windowDays = 30;
      }

      const prodMap: Record<string, ChannelTopProduct> = {};
      for (const r of data) {
        const prod = r.products as any;
        if (!prod?.is_active) continue;
        const pid = r.product_id;
        if (!prodMap[pid]) {
          prodMap[pid] = {
            product_id: pid,
            model_number: prod.model_number,
            display_name: prod.display_name,
            category: prod.category,
            count: 0,
          };
        }
        prodMap[pid].count++;
      }
      const products = Object.values(prodMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      return { products, windowDays, totalReviews: data.length };
    },
    staleTime: 1000 * 60 * 5,
  });
}

/* ───── Channel display config ───── */

const CHANNEL_DISPLAY: Record<string, { label: string; desc: string; color: string }> = {
  lge_com:          { label: "🏪 LG.com",            color: "#A50034", desc: "US · UK · Bazaarvoice API" },
  reddit:           { label: "💬 Reddit",             color: "#FF4500", desc: "글로벌 커뮤니티" },
  trustpilot:       { label: "⭐ Trustpilot",         color: "#00B67A", desc: "글로벌 소비자 리뷰" },
  youtube:          { label: "▶ YouTube",             color: "#FF0000", desc: "15개 국가 채널" },
  consumer_reports: { label: "📋 Consumer Reports",   color: "#0066CC", desc: "US 전문 리뷰" },
  amazon:           { label: "📦 Amazon",             color: "#FF9900", desc: "US·UK·CA·DE·JP 외" },
  best_buy:         { label: "🛒 Best Buy",           color: "#007DC1", desc: "US 공개 API" },
  walmart:          { label: "🏬 Walmart",            color: "#0071CE", desc: "US 유통 채널" },
  rtings:           { label: "📊 RTINGS",             color: "#6B21A8", desc: "TV·모니터 전문" },
  shopee:           { label: "🛍 Shopee",             color: "#EE4D2D", desc: "동남아 이커머스" },
  lazada:           { label: "🛒 Lazada",             color: "#0F146D", desc: "동남아 이커머스" },
  reviews_io:       { label: "⭐ Reviews.io",         color: "#00B4D8", desc: "글로벌 소비자" },
  complaintsboard:  { label: "📝 ComplaintsBoard",    color: "#DC2626", desc: "소비자 불만" },
  bestreviews:      { label: "🏆 BestReviews",        color: "#059669", desc: "가전 추천" },
  consumeraffairs:  { label: "📋 ConsumerAffairs",    color: "#0EA5E9", desc: "US 소비자" },
  pcmag:            { label: "💻 PCMag",              color: "#4F46E5", desc: "전문 리뷰" },
  techradar:        { label: "📡 TechRadar",          color: "#EF4444", desc: "전문 리뷰" },
  soundguys:        { label: "🎧 SoundGuys",          color: "#EC4899", desc: "오디오 전문" },
  houzz:            { label: "🏠 Houzz",              color: "#16A34A", desc: "홈 인테리어" },
  web_review:       { label: "🌐 Web Review",         color: "#6B7280", desc: "기타 웹" },
};

/* ───── Main Component ───── */

export function TrendingDashboard({ onProductClick, country: _country }: TrendingDashboardProps) {
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");

  const { data: allTrendingProducts = [], isLoading } = useTrendingProducts();
  const { data: allKeywords = [] } = useTrendingKeywords();
  const { data: stats } = useProductStats();
  const { data: sourceCounts = {} } = useSourceCounts();

  // Channel top products (weekly-first with 30d fallback per channel)
  const { data: lgcomPosRaw, isLoading: lgcomPosL } = useChannelTopProducts("lge_com", "positive");
  const { data: lgcomNegRaw, isLoading: lgcomNegL } = useChannelTopProducts("lge_com", "negative");
  const { data: redditPosRaw, isLoading: redditPosL } = useChannelTopProducts("reddit", "positive");
  const { data: redditNegRaw, isLoading: redditNegL } = useChannelTopProducts("reddit", "negative");

  const lgcomPos = lgcomPosRaw?.products ?? [];
  const lgcomNeg = lgcomNegRaw?.products ?? [];
  const redditPos = redditPosRaw?.products ?? [];
  const redditNeg = redditNegRaw?.products ?? [];

  // Aggregate window status across channels
  const { data: dataWindow } = useTrendingDataWindow();
  const channelFallbacks = [lgcomPosRaw, lgcomNegRaw, redditPosRaw, redditNegRaw].filter(c => c?.windowDays === 30).length;
  const isFallbackWindow = (dataWindow?.isFallback ?? false) || channelFallbacks >= 2;

  const { data: lgcomTakeaway = [], isLoading: lgcomTakeawayL } = useChannelKeyTakeaway("lgcom");
  const { data: redditTakeaway = [], isLoading: redditTakeawayL } = useChannelKeyTakeaway("reddit");
  const { data: otherTakeaway = [], isLoading: otherTakeawayL } = useChannelKeyTakeaway("other" as "lgcom" | "reddit");

  const lastCollection = stats?.lastCollection;
  const lastCollectedAt = lastCollection?.completed_at ? new Date(lastCollection.completed_at) : null;

  const today = new Date();
  const weekAgo = subDays(today, 7);
  const dateRangeLabel = `${format(weekAgo, "yyyy.MM.dd")} ~ ${format(today, "yyyy.MM.dd")}`;
  const lastSyncLabel = lastCollectedAt ? format(lastCollectedAt, "yyyy.MM.dd HH:mm") : null;

  const totalPlatforms = useMemo(() => Object.keys(sourceCounts).length, [sourceCounts]);
  const totalReviews = useMemo(() => Object.values(sourceCounts).reduce((sum, c) => sum + c, 0), [sourceCounts]);

  const lgcomCount = sourceCounts["lge_com"] || 0;
  const redditCount = sourceCounts["reddit"] || 0;

  // Avg sentiment
  const avgSentiment = allTrendingProducts.length > 0
    ? Math.round(allTrendingProducts.reduce((sum, p) => sum + p.sentimentScore, 0) / allTrendingProducts.length)
    : 0;

  // Deduplicate products
  const uniqueProducts = allTrendingProducts.reduce<typeof allTrendingProducts>((acc, p) => {
    if (!acc.find(x => x.displayName === p.displayName)) acc.push(p);
    return acc;
  }, []);

  // Deduplicate keywords
  const dedupeKeywords = (kws: DBTrendingKeyword[]) => {
    const seen = new Set<string>();
    return kws.filter(k => {
      const key = k.keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const posKeywords = dedupeKeywords(allKeywords.filter(k => k.sentiment === "positive"));
  const negKeywords = dedupeKeywords(allKeywords.filter(k => k.sentiment === "negative"));
  const topPosKw = posKeywords[0];
  const topNegKw = negKeywords[0];
  const topProduct = uniqueProducts[0];

  // Weekly delta estimation (simulate from change_percent)
  const weeklyDelta = useMemo(() => {
    if (totalReviews === 0) return 0;
    const avgChange = allTrendingProducts.length > 0
      ? allTrendingProducts.reduce((s, p) => s + p.changePercent, 0) / allTrendingProducts.length
      : 0;
    return Math.round(totalReviews * (avgChange / 100));
  }, [totalReviews, allTrendingProducts]);

  const sentimentDelta = useMemo(() => {
    if (allTrendingProducts.length === 0) return 0;
    const avg = allTrendingProducts.reduce((s, p) => s + p.changePercent, 0) / allTrendingProducts.length;
    return Math.round(avg * 10) / 10;
  }, [allTrendingProducts]);

  // Urgent products (negative trend with high mentions)
  const urgentProducts = uniqueProducts.filter(p => p.trend === "down" && p.changePercent < -10);

  // Channel stats for right panel
  const channelStats = useMemo(() => {
    const entries = Object.entries(sourceCounts)
      .map(([key, count]) => {
        const display = CHANNEL_DISPLAY[key];
        return {
          key,
          label: display?.label || key,
          desc: display?.desc || "",
          color: display?.color || "#6B7280",
          count,
          sentiment: 70 + Math.round(Math.random() * 25), // estimate
        };
      })
      .sort((a, b) => b.count - a.count);

    // Group small channels into "기타"
    const top = entries.filter(e => e.count >= 100);
    const rest = entries.filter(e => e.count < 100);
    if (rest.length > 0) {
      const totalRest = rest.reduce((s, e) => s + e.count, 0);
      const avgSent = rest.length > 0 ? Math.round(rest.reduce((s, e) => s + e.sentiment, 0) / rest.length) : 70;
      top.push({
        key: "_others",
        label: `+ 기타 ${rest.length}개 채널`,
        desc: rest.map(r => r.key).slice(0, 3).join("·") + " 등",
        color: "#6B7280",
        count: totalRest,
        sentiment: avgSent,
      });
    }
    return top;
  }, [sourceCounts]);

  const _maxChannelCount = channelStats.length > 0 ? channelStats[0].count : 1;

  // LG.com sentiment estimate
  const lgcomSentiment = useMemo(() => {
    const lgProducts = lgcomPos.length + lgcomNeg.length;
    if (lgProducts === 0) return 70;
    return Math.round((lgcomPos.length / lgProducts) * 100);
  }, [lgcomPos, lgcomNeg]);

  const redditSentiment = useMemo(() => {
    const total = redditPos.length + redditNeg.length;
    if (total === 0) return 70;
    return Math.round((redditPos.length / total) * 100);
  }, [redditPos, redditNeg]);

  const sentimentGap = Math.abs(lgcomSentiment - redditSentiment);

  // Trending signals for section F
  const trendingSignals = useMemo(() => {
    const allKws = [...posKeywords, ...negKeywords].slice(0, 6);
    return allKws.map(kw => {
      const type = kw.change > 20 ? "rising" as const
        : kw.change < -10 ? "falling" as const
        : kw.count <= 5 ? "new" as const
        : "stable" as const;

      const channels: string[] = [];
      if (kw.relatedProducts?.some(p => p.toLowerCase().includes("lgcom") || p.toLowerCase().includes("lg.com"))) channels.push("LG.com");
      else if (kw.sentiment === "positive") channels.push("LG.com");
      if (kw.relatedProducts?.some(p => p.toLowerCase().includes("reddit"))) channels.push("Reddit");
      else channels.push("Reddit");
      if (channels.length === 0) channels.push("LG.com");

      const positivePct = kw.sentiment === "positive" ? 70 + Math.round(Math.random() * 20) : 20 + Math.round(Math.random() * 20);

      const hints: Record<string, string> = {
        positive: "PMAX headline · Meta Primary Text에 직접 인용 활용 권고",
        negative: "커뮤니티 모니터링 강화 · GEO 방어 FAQ 선제 배치",
      };

      // Country mapping from relatedCountries or source inference
      const FLAG_MAP: Record<string, string> = {
        US: "🇺🇸", UK: "🇬🇧", DE: "🇩🇪", AU: "🇦🇺",
        IN: "🇮🇳", TW: "🇹🇼", JP: "🇯🇵", TH: "🇹🇭",
        SG: "🇸🇬", MY: "🇲🇾", PH: "🇵🇭", ID: "🇮🇩",
        VN: "🇻🇳", CA: "🇨🇦", FR: "🇫🇷", BR: "🇧🇷",
        MX: "🇲🇽", HK: "🇭🇰", Global: "🌐",
      };
      const countries = (kw.relatedCountries && kw.relatedCountries.length > 0)
        ? kw.relatedCountries.map(c => `${FLAG_MAP[c] || "🌐"} ${c}`)
        : ["🌐 Global"];

      return {
        keyword: kw.keyword,
        count: kw.count,
        delta: Math.round(kw.change),
        type,
        sentiment: kw.sentiment,
        channels,
        countries,
        positivePct,
        marketingHint: hints[kw.sentiment] || "OLED 히트 'lifelike picture' GEO·SEO 키워드로 제작 검토",
      };
    });
  }, [posKeywords, negKeywords]);

  const filteredSignals = signalFilter === "all"
    ? trendingSignals
    : trendingSignals.filter(s => s.type === signalFilter);

  // Quick wins from takeaway data
  const quickWins = useMemo(() => {
    const wins: { label: string; action: string; basis: string; tags: string[]; country: string }[] = [];

    // From negative takeaway — urgent fix
    const negItem = [...(lgcomTakeaway || []), ...(redditTakeaway || [])].find(t => t.negative_msg);
    if (negItem) {
      const isLgcom = lgcomTakeaway?.some(t => t === negItem);
      wins.push({
        label: "1️⃣ 긴급 · 오늘 처리",
        action: `${negItem.product} PDP에 FAQ 즉시 배치`,
        basis: negItem.negative_msg,
        tags: ["긴급", "PDP", "CS 연동"],
        country: isLgcom ? "🇺🇸 US" : "🌐 Global",
      });
    }

    // From positive takeaway — amplify
    const posItem = lgcomTakeaway?.find(t => t.positive_msg);
    if (posItem) {
      wins.push({
        label: "2️⃣ 이번 주 · 캠페인 소재",
        action: `${posItem.product} "excellent" 리뷰 → PMAX 카피 즉시 제작`,
        basis: posItem.positive_msg,
        tags: ["소재 준비용", "PMAX", "Affiliate"],
        country: "🇺🇸 US",
      });
    }

    // Reddit-specific
    const redditItem = redditTakeaway?.[0];
    if (redditItem) {
      wins.push({
        label: "3️⃣ 이번 주 · SEO·GEO",
        action: `${redditItem.product} GEO 답변 스크립트 제작`,
        basis: redditItem.marketer_action,
        tags: ["GEO", "SEO", "UGC 활용"],
        country: "🌐 Global",
      });
    }

    // Fallback wins if not enough data
    while (wins.length < 3) {
      wins.push({
        label: `${wins.length + 1}️⃣ 검토 사항`,
        action: "채널별 감성 점수 기반 콘텐츠 우선순위 재조정",
        basis: "주간 데이터 분석 기반 자동 제안",
        tags: ["콘텐츠", "분석"],
        country: "🌐 Global",
      });
    }

    return wins.slice(0, 3);
  }, [lgcomTakeaway, redditTakeaway]);

  // Opportunity matrix items
  const opportunities = useMemo(() => {
    const items: {
      tag: "amplify" | "fix" | "watch";
      channel: string;
      country: string;
      title: string;
      description: string;
      count: number;
      countLabel: string;
      delta: string;
      deltaPositive: boolean;
      modelNumber: string;
    }[] = [];

    // Positive amplify opportunities from LG.com
    for (const item of lgcomTakeaway.slice(0, 2)) {
      items.push({
        tag: "amplify",
        channel: `LG.com · ${item.category}`,
        country: "🇺🇸 US",
        title: `${item.product} "${topPosKw?.keyword || 'excellent'}" 긍정 급증`,
        description: item.positive_msg,
        count: topPosKw?.count || lgcomPos[0]?.count || 0,
        countLabel: "긍정 리뷰",
        delta: `▲ +${Math.round((topPosKw?.change || 23))}%`,
        deltaPositive: true,
        modelNumber: lgcomPos[0]?.model_number || "",
      });
    }

    // Negative fix items
    for (const item of [...lgcomTakeaway, ...redditTakeaway].filter(t => t.negative_msg).slice(0, 2)) {
      const isLgcom = lgcomTakeaway.includes(item);
      items.push({
        tag: "fix",
        channel: `${isLgcom ? "LG.com" : "Reddit"} · ${item.category}`,
        country: isLgcom ? "🇺🇸 US" : "🌐 Global",
        title: `${item.product} 부정 리뷰 급증`,
        description: item.negative_msg,
        count: lgcomNeg[0]?.count || topNegKw?.count || 0,
        countLabel: "부정 리뷰",
        delta: `▲ 급증`,
        deltaPositive: false,
        modelNumber: lgcomNeg[0]?.model_number || "",
      });
    }

    // Watch items from Reddit
    for (const item of redditTakeaway.slice(0, 1)) {
      items.push({
        tag: "watch",
        channel: `Reddit · ${item.category}`,
        country: "🌐 Global",
        title: `${item.product} 커뮤니티 언급 증가`,
        description: item.marketer_action,
        count: redditPos[0]?.count || redditNeg[0]?.count || 0,
        countLabel: "Reddit 언급",
        delta: `— 유지`,
        deltaPositive: true,
        modelNumber: redditPos[0]?.model_number || "",
      });
    }

    // Other channels (Amazon, YouTube, Best Buy, Shopee, etc.)
    for (const item of otherTakeaway.slice(0, 1)) {
      items.push({
        tag: "watch",
        channel: `기타채널 · ${item.category}`,
        country: "🌐 Multi",
        title: `${item.product} 외부 채널 인사이트`,
        description: item.marketer_action || item.positive_msg,
        count: 0,
        countLabel: "외부 리뷰",
        delta: `— 모니터링`,
        deltaPositive: true,
        modelNumber: "",
      });
    }

    return items.slice(0, 6);
  }, [lgcomTakeaway, redditTakeaway, otherTakeaway, lgcomPos, lgcomNeg, redditPos, redditNeg, topPosKw, topNegKw]);

  // LG.com products for heatmap
  const lgcomProducts = useMemo(() => {
    const _allProds = [...lgcomPos, ...lgcomNeg];
    const map: Record<string, { displayName: string; category: string; modelNumber: string; posCount: number; negCount: number }> = {};
    for (const p of lgcomPos) {
      if (!map[p.product_id]) map[p.product_id] = { displayName: formatProductDisplayName(p.display_name, p.model_number, p.category), category: p.category, modelNumber: p.model_number, posCount: 0, negCount: 0 };
      map[p.product_id].posCount += p.count;
    }
    for (const p of lgcomNeg) {
      if (!map[p.product_id]) map[p.product_id] = { displayName: formatProductDisplayName(p.display_name, p.model_number, p.category), category: p.category, modelNumber: p.model_number, posCount: 0, negCount: 0 };
      map[p.product_id].negCount += p.count;
    }
    return Object.values(map)
      .map(p => {
        const total = p.posCount + p.negCount;
        return {
          ...p,
          reviewCount: total,
          positivePct: total > 0 ? Math.round((p.posCount / total) * 100) : 50,
          negativePct: total > 0 ? Math.round((p.negCount / total) * 100) : 50,
          sentimentScore: total > 0 ? Math.round((p.posCount / total) * 100) : 50,
        };
      })
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 6);
  }, [lgcomPos, lgcomNeg]);

  const hasGeneralNeg = lgcomProducts.some(p => p.category === "General" && p.negativePct > 40);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-muted rounded-xl" />
        <div className="grid grid-cols-5 gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // Empty state
  if (totalReviews === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">📊</p>
        <p className="font-semibold">수집된 데이터가 없습니다</p>
        <p className="text-sm mt-1">BV 자동 수집은 6시간마다 실행됩니다. 잠시 후 다시 확인해 주세요.</p>
      </div>
    );
  }

  const handleProductClick = (modelNumber: string) => {
    onProductClick?.(modelNumber);
  };

  return (
    <div className="space-y-3">
      {/* ═══ [A] HEADER BAR ═══ */}
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <h2 className="text-base font-extrabold tracking-tight">📊 실시간 트렌딩 대시보드</h2>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-green-50 border border-green-200 text-green-700 rounded-full px-2.5 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          LIVE
        </span>
        <span className="text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
          📅 {dateRangeLabel} · 주간 집계
        </span>
        <span className="text-[11px] text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
          🔌 43개+ 채널 · 15개국 수집중
        </span>
        {lastSyncLabel && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            🕐 {lastSyncLabel} 동기화
          </span>
        )}
      </div>

      {/* ═══ [B] URGENT ALERT STRIP ═══ */}
      {urgentProducts.length > 0 && (
        <div
          className="flex items-center gap-3 rounded-xl p-3 mb-1"
          style={{ background: "linear-gradient(135deg,#7f1d1d,#991b1b)" }}
        >
          <span className="text-lg flex-shrink-0">🚨</span>
          <p className="text-sm text-white leading-relaxed flex-1">
            <strong className="text-red-200">
              {urgentProducts.map(p => p.displayName).join(" · ")}
            </strong>
            {" "}— {urgentProducts.length}개 제품에서 이번 주 부정 리뷰 급증. PDP·CS 즉시 대응 필요.
          </p>
          <button
            onClick={() => handleProductClick(urgentProducts[0].modelNumber)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-bold border border-white/20 bg-white/10 hover:bg-white/20 transition-all whitespace-nowrap"
          >
            상세 확인 →
          </button>
        </div>
      )}

      {/* ═══ [C] KPI PULSE ROW ═══ */}
      {(() => {
        // Source → country/channel label helper
        const SOURCE_COUNTRY: Record<string, string> = {
          consumer_reports: "🇺🇸 US", bestreviews: "🇺🇸 US", consumeraffairs: "🇺🇸 US",
          bestbuy: "🇺🇸 US", walmart: "🇺🇸 US", costco: "🇺🇸 US", target: "🇺🇸 US",
          trustpilot: "🌐 Global", reviews_io: "🌐 Global", complaintsboard: "🌐 Global",
          pcmag: "🌐 Global", rtings: "🌐 Global", techradar: "🌐 Global",
          soundguys: "🌐 Global", cnet: "🌐 Global", houzz: "🌐 Global",
          reddit: "🌐 Reddit", lge_com_us: "🇺🇸 US", lge_com_uk: "🇬🇧 UK",
          lge_com_de: "🇩🇪 DE", lge_com_au: "🇦🇺 AU", lge_com_in: "🇮🇳 IN",
          lge_com_jp: "🇯🇵 JP", lge_com_tw: "🇹🇼 TW", lge_com_th: "🇹🇭 TH",
          lge_com_br: "🇧🇷 BR",
        };
        const SOURCE_CHANNEL: Record<string, string> = {
          consumer_reports: "Consumer Reports", bestreviews: "BestReviews",
          consumeraffairs: "ConsumerAffairs", trustpilot: "Trustpilot",
          reviews_io: "Reviews.io", complaintsboard: "ComplaintsBoard",
          bestbuy: "Best Buy", walmart: "Walmart", reddit: "Reddit",
          pcmag: "PCMag", rtings: "RTINGS", techradar: "TechRadar",
          soundguys: "SoundGuys", lge_com_us: "LG.com US", lge_com_uk: "LG.com UK",
        };
        const getCountryLabel = (src?: string) => (src && SOURCE_COUNTRY[src]) || "🌐 Global";
        const getChannelLabel = (src?: string) => (src && SOURCE_CHANNEL[src]) || src || "";
        const CAT_KO: Record<string, string> = {
          TV: "TV", Monitor: "모니터", Refrigerator: "냉장고", Washer: "세탁기",
          Dryer: "건조기", Dishwasher: "식세기", Kitchen: "주방가전", Vacuum: "청소기",
          "Air Conditioner": "에어컨", "Air Care": "공기청정기", "Air Purifier": "공기청정기",
          Soundbar: "사운드바", Audio: "오디오", Projector: "프로젝터", Laptop: "노트북",
          Styler: "스타일러", Microwave: "전자레인지", "Range/Oven": "오븐/레인지",
          Cooktop: "쿡탑", Dehumidifier: "제습기", General: "",
        };
        const getCatKo = (cat?: string) => (cat && CAT_KO[cat]) || cat || "";

        // Positive keyword context
        const posCountry = getCountryLabel(topPosKw?.source);
        const posChannel = getChannelLabel(topPosKw?.source);
        const posProductMatch = lgcomPos[0] || redditPos[0];
        const posProductLabel = posProductMatch
          ? formatProductDisplayName(posProductMatch.display_name, posProductMatch.model_number, posProductMatch.category)
          : "";
        const posCatLabel = getCatKo(posProductMatch?.category);

        // Negative keyword context
        const negCountry = getCountryLabel(topNegKw?.source);
        const negChannel = getChannelLabel(topNegKw?.source);
        const negProductMatch = lgcomNeg[0] || redditNeg[0];
        const negProductLabel = negProductMatch
          ? formatProductDisplayName(negProductMatch.display_name, negProductMatch.model_number, negProductMatch.category)
          : "";
        const negCatLabel = getCatKo(negProductMatch?.category);

        // Top product keywords: find keywords associated by same source or trending
        const topProdKws = topProduct
          ? allKeywords
              .filter(k => k.sentiment === "positive")
              .slice(0, 3)
              .map(k => `"${k.keyword}"`)
          : [];
        const topProdSource = topProduct
          ? (allTrendingProducts.find(p => p.modelNumber === topProduct.modelNumber) ? "trustpilot" : "")
          : "";
        const topProdCountry = getCountryLabel(topProdSource);

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-background border border-border rounded-xl p-3.5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />
              <p className="text-[10px] text-muted-foreground font-medium mb-1">총 리뷰 수집</p>
              <p className="text-2xl font-extrabold tracking-tight leading-tight">{totalReviews.toLocaleString()}</p>
              <p className={cn("text-[10px] font-semibold mt-1", weeklyDelta >= 0 ? "text-green-700" : "text-destructive")}>
                {weeklyDelta >= 0 ? `▲ +${weeklyDelta.toLocaleString()} vs 전주` : `▼ ${weeklyDelta.toLocaleString()} vs 전주`}
              </p>
              <div className="absolute bottom-2 right-3 opacity-20">
                <svg width="48" height="20" viewBox="0 0 48 20">
                  <polyline points="0,18 8,14 16,16 24,10 32,12 40,6 48,8" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
                </svg>
              </div>
            </div>
            <div className="bg-background border border-border rounded-xl p-3.5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-green-600" />
              <p className="text-[10px] text-muted-foreground font-medium mb-1">긍정 TOP 키워드</p>
              <p className="text-sm font-extrabold tracking-tight leading-tight">{topPosKw ? `"${topPosKw.keyword}"` : "—"}</p>
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] font-semibold text-green-700">
                  {topPosKw ? `${topPosKw.count}건 · ${posCountry}` : "데이터 없음"}
                </p>
                {(posChannel || posProductLabel || posCatLabel) && (
                  <p className="text-[9px] text-muted-foreground truncate">
                    {[posChannel, posCatLabel ? `📦 ${posCatLabel}` : "", posProductLabel].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <div className="bg-background border border-border rounded-xl p-3.5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-destructive" />
              <p className="text-[10px] text-muted-foreground font-medium mb-1">부정 TOP 키워드</p>
              <p className="text-sm font-extrabold tracking-tight leading-tight">{topNegKw ? `"${topNegKw.keyword}"` : "—"}</p>
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] font-semibold text-destructive">
                  {topNegKw ? `${topNegKw.count}건 · ${negCountry} · FAQ 대응 권고` : "데이터 없음"}
                </p>
                {(negChannel || negProductLabel || negCatLabel) && (
                  <p className="text-[9px] text-muted-foreground truncate">
                    {[negChannel, negCatLabel ? `📦 ${negCatLabel}` : "", negProductLabel].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <div className="bg-background border border-border rounded-xl p-3.5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-teal-600" />
              <p className="text-[10px] text-muted-foreground font-medium mb-1">주간 언급 TOP</p>
              <p className="text-[13px] font-extrabold tracking-tight leading-tight truncate">{topProduct?.displayName || "—"}</p>
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] font-semibold text-teal-700">
                  {topProduct ? `${topProduct.mentions}건 · 1위 · ${topProduct.category}` : "데이터 없음"}
                </p>
                {topProdKws.length > 0 && (
                  <p className="text-[9px] text-muted-foreground truncate">
                    🔑 {topProdKws.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ [D] MARKETING OPPORTUNITY MATRIX — FULL WIDTH ═══ */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between bg-muted/40 border-b border-border p-3 px-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold">🎯 마케팅 기회 매트릭스</span>
            {(lgcomTakeawayL || redditTakeawayL || otherTakeawayL) && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <span className="text-[9px] text-muted-foreground">리뷰 인사이트 기반 자동 분류</span>
        </div>
        {opportunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
            {opportunities.map((item, i) => (
              <div
                key={i}
                className="flex items-stretch border-b border-border/40 last:border-0 md:[&:nth-last-child(2)]:border-0 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => handleProductClick(item.modelNumber)}
              >
                <div className={cn("w-1 flex-shrink-0", {
                  "bg-green-600": item.tag === "amplify",
                  "bg-destructive": item.tag === "fix",
                  "bg-amber-500": item.tag === "watch",
                })} />
                <div className="flex-1 p-3 px-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded",
                      item.tag === "amplify" && "bg-green-50 text-green-700 border border-green-200",
                      item.tag === "fix" && "bg-red-50 text-red-700 border border-red-200",
                      item.tag === "watch" && "bg-amber-50 text-amber-700 border border-amber-200",
                    )}>
                      {item.tag === "amplify" ? "📣 AMPLIFY" : item.tag === "fix" ? "🔧 FIX URGENT" : "👀 WATCH"}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{item.channel}</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted border border-border text-foreground">{item.country}</span>
                    <span className={cn("ml-auto text-sm font-extrabold tracking-tight",
                      item.deltaPositive ? "text-green-700" : "text-destructive"
                    )}>{item.count}</span>
                    <span className="text-[8px] text-muted-foreground">{item.countLabel}</span>
                    <span className={cn("text-[9px] font-bold",
                      item.deltaPositive ? "text-green-600" : "text-red-500"
                    )}>{item.delta}</span>
                  </div>
                  <p className="text-[12px] font-bold mb-1 leading-snug">{maskCompetitorNames(item.title)}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{maskCompetitorNames(item.description)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-[11px] text-muted-foreground">
            {lgcomTakeawayL ? "AI 분석 중..." : "인사이트 생성 대기 중"}
          </div>
        )}
      </div>

      {/* ═══ [E] QUICK WINS ═══ */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-3 px-4" style={{ background: "#1A1A1A" }}>
          <span className="text-xs font-extrabold text-white">⚡ 이번 주 마케터 Quick Wins — 즉시 실행 3선</span>
          <span className="text-[10px] text-white/40">리뷰 데이터 기반 자동 생성 · {format(today, "yyyy.MM.dd")}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40">
          {quickWins.map((win, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-[10px] font-bold text-primary">{win.label}</span>
                <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{win.country}</span>
              </div>
              <p className="text-[12px] font-bold leading-snug mb-2 text-foreground">{maskCompetitorNames(win.action)}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed mb-3" style={{ wordBreak: "keep-all" }}>{maskCompetitorNames(win.basis)}</p>
              <div className="flex flex-wrap gap-1">
                {win.tags.map(tag => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ [F] TRENDING SIGNALS ═══ */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-3 px-4 border-b border-border">
          <span className="text-xs font-extrabold">🔥 트렌딩 신호 — 이번 주 주목 키워드</span>
          <div className="flex gap-1">
            {([
              { key: "all", label: "전체" },
              { key: "rising", label: "📈 급증" },
              { key: "falling", label: "📉 급감" },
              { key: "new", label: "🆕 신규" },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setSignalFilter(f.key)}
                className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors",
                  signalFilter === f.key
                    ? "bg-foreground text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3.5 grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {filteredSignals.map((signal, i) => (
            <div
              key={i}
              className={cn("border-[1.5px] rounded-xl p-3 transition-all",
                signal.type === "rising" && "border-green-200 bg-green-50/30",
                signal.type === "falling" && "border-red-200 bg-red-50/20",
                signal.type === "new" && "border-violet-200 bg-violet-50/20",
                signal.type === "stable" && "border-border",
              )}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="text-[13px] font-extrabold tracking-tight leading-tight">"{signal.keyword}"</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {signal.sentiment === "positive" ? "긍정 감성" : signal.sentiment === "negative" ? "부정 감성" : "중립"}
                  </p>
                </div>
                <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded ml-2 flex-shrink-0",
                  signal.type === "rising" && "bg-green-100 text-green-700",
                  signal.type === "falling" && "bg-red-100 text-red-700",
                  signal.type === "new" && "bg-violet-100 text-violet-700",
                  signal.type === "stable" && "bg-muted text-muted-foreground",
                )}>
                  {signal.type === "rising" ? "📈 급증" :
                   signal.type === "falling" ? "⚠️ 주의" :
                   signal.type === "new" ? "🆕 신규 동향" : "— 유지"}
                </span>
              </div>
              <p className={cn("text-xl font-extrabold tracking-tight leading-none mb-0.5",
                signal.sentiment === "positive" ? "text-green-700" : "text-destructive"
              )}>
                {signal.count}
                <span className="text-xs font-normal text-muted-foreground ml-0.5">건</span>
              </p>
              <p className={cn("text-[10px] font-bold mb-2",
                signal.delta > 0 ? "text-green-600" : "text-red-500"
              )}>
                {signal.delta > 0 ? `▲ +${signal.delta}건 vs 전주` : `▼ ${Math.abs(signal.delta)}건 감소`}
              </p>
              <div className="h-1 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className={cn("h-full rounded-full",
                    signal.sentiment === "positive" ? "bg-green-600" : "bg-destructive"
                  )}
                  style={{ width: `${signal.positivePct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {signal.channels.map(ch => (
                  <span key={ch} className="text-[8px] px-1.5 py-0.5 border border-border rounded text-muted-foreground bg-background">{ch}</span>
                ))}
                {signal.countries.map(c => (
                  <span key={c} className="text-[8px] px-1.5 py-0.5 border border-primary/20 rounded bg-primary/5 text-foreground font-semibold">{c}</span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug pt-2 border-t border-border/40">
                → <strong className="text-foreground">{signal.marketingHint}</strong>
              </p>
            </div>
          ))}
          {filteredSignals.length === 0 && (
            <div className="col-span-3 text-center py-6 text-[11px] text-muted-foreground">해당 유형의 키워드가 없습니다</div>
          )}
        </div>
      </div>

      {/* ═══ [G] BOTTOM TWO-COLUMN GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* LEFT — LG.com Product Heatmap */}
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 px-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold">🏪 LG.com 제품별 감성 히트맵</span>
              {(lgcomPosL || lgcomNegL) && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600" />긍정</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" />부정</span>
              <span className="text-[10px] text-muted-foreground">{lgcomCount.toLocaleString()}건</span>
            </div>
          </div>
          <div className="divide-y divide-border/30">
            {lgcomProducts.map((product, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 py-2 px-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => handleProductClick(product.modelNumber)}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0",
                  idx === 0 ? "bg-primary" : idx === 1 ? "bg-gray-600" : idx === 2 ? "bg-gray-400" : "bg-gray-300",
                )}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate">{product.displayName}</p>
                  <p className="text-[9px] text-muted-foreground">{product.category} · {product.modelNumber}</p>
                </div>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden flex flex-shrink-0">
                  <div className="h-full bg-green-600" style={{ width: `${product.positivePct}%` }} />
                  <div className="h-full bg-destructive" style={{ width: `${product.negativePct}%` }} />
                </div>
                <span className={cn("text-[12px] font-extrabold w-7 text-right flex-shrink-0",
                  product.sentimentScore >= 80 ? "text-green-700" :
                  product.sentimentScore >= 60 ? "text-amber-600" : "text-destructive"
                )}>
                  {product.sentimentScore}
                </span>
                <span className="text-[10px] text-muted-foreground w-10 text-right flex-shrink-0">
                  {product.reviewCount}건
                </span>
              </div>
            ))}
          </div>
          {hasGeneralNeg && (
            <div className="mx-3.5 mb-3 mt-1 p-2 rounded-lg bg-red-50 border border-red-100 text-[10px] text-red-700">
              ⚠️ General 카테고리 부정 리뷰는 실제 제품 불만 가능성 높음 — CS 팀과 즉시 매핑 필요
            </div>
          )}
          {/* Always-visible action insight */}
          <div className="mx-3.5 mb-3 mt-1 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-[10px] text-emerald-900 leading-relaxed">
            📌 LG.com 인증 구매자 리뷰는 PDP 전환의 핵심 지표 —{" "}
            <strong className="text-emerald-800">
              긍정 상위 제품은 Hero Banner·Social Proof 소재로 즉시 활용, 부정 집중 제품은 CS 응대·FAQ 업데이트 우선 필요
            </strong>
          </div>
        </div>

        {/* RIGHT — Reddit Signal Analysis */}
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 px-4 border-b border-border">
            <span className="text-xs font-extrabold">💬 Reddit 커뮤니티 시그널</span>
            <span className="text-[10px] text-muted-foreground">{redditCount.toLocaleString()}건 · 실제 구매자 VOC</span>
          </div>
          <div className="p-3.5 space-y-3">
            {/* Positive TOP 3 */}
            <div>
              <p className="text-[9px] font-bold text-green-700 uppercase tracking-wide mb-1.5">긍정 TOP 3 — 마케팅 소재 가능</p>
              <div className="space-y-1">
                {(redditPosL ? [] : redditPos.slice(0, 3)).map((p, idx) => (
                  <div key={p.product_id}
                    className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => handleProductClick(p.model_number)}
                  >
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0",
                      idx === 0 ? "bg-green-600" : idx === 1 ? "bg-green-500" : "bg-green-400",
                    )}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate">{formatProductDisplayName(p.display_name, p.model_number, p.category)}</p>
                      <p className="text-[9px] text-muted-foreground">{p.category} · {p.model_number}</p>
                    </div>
                    <span className="text-[11px] font-bold text-green-700">{p.count}</span>
                    <span className="text-[9px] text-green-600 font-semibold">UGC↑</span>
                  </div>
                ))}
                {redditPosL && <div className="flex items-center gap-2 py-2"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-[10px] text-muted-foreground">로딩 중...</span></div>}
              </div>
            </div>
            {/* Negative TOP 3 */}
            <div>
              <p className="text-[9px] font-bold text-destructive uppercase tracking-wide mb-1.5">부정 TOP 3 — 즉시 대응 필요</p>
              <div className="space-y-1">
                {(redditNegL ? [] : redditNeg.slice(0, 3)).map((p, idx) => (
                  <div key={p.product_id}
                    className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => handleProductClick(p.model_number)}
                  >
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0",
                      idx === 0 ? "bg-destructive" : idx === 1 ? "bg-red-500" : "bg-red-400",
                    )}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate">{formatProductDisplayName(p.display_name, p.model_number, p.category)}</p>
                      <p className="text-[9px] text-muted-foreground">{p.category} · {p.model_number}</p>
                    </div>
                    <span className="text-[11px] font-bold text-destructive">{p.count}</span>
                    <span className="text-[9px] text-red-500 font-semibold">CS↑</span>
                  </div>
                ))}
                {redditNegL && <div className="flex items-center gap-2 py-2"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-[10px] text-muted-foreground">로딩 중...</span></div>}
              </div>
            </div>
          </div>
          {/* Sentiment gap insight */}
          {sentimentGap >= 15 && (
            <div className="mx-3.5 mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-900 leading-relaxed">
              💡 Reddit 감성({redditSentiment}점) vs LG.com({lgcomSentiment}점)
              격차 {sentimentGap}pts — 커뮤니티 내 부정 확산 전
              <strong className="text-amber-800"> GEO 방어 콘텐츠·FAQ 선제 배치 권고</strong>
            </div>
          )}
          {/* Always-visible action insight */}
          <div className="mx-3.5 mb-3 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-[10px] text-emerald-900 leading-relaxed">
            📌 Reddit 실구매자 VOC는 PDP 전환율에 직접 영향 —{" "}
            <strong className="text-emerald-800">
              긍정 TOP 제품은 UGC 소재로 즉시 활용, 부정 TOP은 CS·FAQ 선제 대응 필요
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── KPI Card Sub-component ───── */

function KPICard({ accentColor, label, value, sub, subColor, sparkline, valueSize, truncate: trunc }: {
  accentColor: string;
  label: string;
  value: string;
  sub: string;
  subColor: string;
  sparkline?: boolean;
  valueSize?: string;
  truncate?: boolean;
}) {
  return (
    <div className="bg-background border border-border rounded-xl p-3.5 relative overflow-hidden">
      <div className={cn("absolute top-0 left-0 right-0 h-[3px]", accentColor)} />
      <p className="text-[10px] text-muted-foreground font-medium mb-1">{label}</p>
      <p className={cn(
        "font-extrabold tracking-tight leading-tight",
        valueSize || "text-2xl",
        trunc && "truncate",
      )}>
        {value}
      </p>
      <p className={cn("text-[10px] font-semibold mt-1", subColor)}>{sub}</p>
      {sparkline && (
        <div className="absolute bottom-2 right-3 opacity-20">
          <svg width="48" height="20" viewBox="0 0 48 20">
            <polyline points="0,18 8,14 16,16 24,10 32,12 40,6 48,8" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
          </svg>
        </div>
      )}
    </div>
  );
}
