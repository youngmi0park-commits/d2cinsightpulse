import { useState } from "react";
import { Globe, Loader2, ThumbsUp, ThumbsDown, TrendingUp, AlertTriangle, Sparkles, RefreshCw, BarChart3, Lightbulb } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { maskCompetitorNames } from "@/lib/sentiment";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountryFilterBar, countryToSourceFilter } from "@/components/CountryFilterBar";
import { WEEKLY_MIN_REVIEWS, getSinceISO } from "@/hooks/useProductData";

/* ── types ── */
interface ProductInsight {
  rank: number;
  name: string;
  category: string;
  mentions: number;
  positiveInsight: string;
  negativeInsight: string;
}

interface ChannelTakeaway {
  momentum: string;
  friction: string;
}

interface ChannelInsight {
  channel: string;
  reviewCount: number;
  products: ProductInsight[];
  takeaway: ChannelTakeaway;
}

interface SummaryLine {
  category: string;
  insight: string;
}

interface InsightsResponse {
  executiveSummary?: (string | SummaryLine)[];
  keyTakeaway?: string;
  channels: ChannelInsight[];
  totalReviews: number;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/* ── ISO2 → LGE 법인코드 매핑 (RIS Subsidiary List 기준) ── */
const ISO_TO_LGE: Record<string, string> = {
  US: "LGEUS", UK: "LGEUK", CA: "LGECI", DE: "LGEDE", FR: "LGEFS", AU: "LGEAP",
  BR: "LGESP", MX: "LGEMS", JP: "LGEJP", SG: "LGESL", MY: "LGEML", TH: "LGETH",
  PH: "LGEPH", ID: "LGEIN", VN: "LGEVN", TW: "LGETT", HK: "LGEHK", IN: "LGEIL",
  NL: "LGEBN",
};

/* ── 법인코드 → 국기 ── */
const LGE_FLAGS: Record<string, string> = {
  LGEUS: "🇺🇸", LGEUK: "🇬🇧", LGECI: "🇨🇦", LGEDE: "🇩🇪", LGEFS: "🇫🇷", LGEAP: "🇦🇺",
  LGESP: "🇧🇷", LGEMS: "🇲🇽", LGEJP: "🇯🇵", LGESL: "🇸🇬", LGEML: "🇲🇾", LGETH: "🇹🇭",
  LGEPH: "🇵🇭", LGEIN: "🇮🇩", LGEVN: "🇻🇳", LGETT: "🇹🇼", LGEHK: "🇭🇰", LGEIL: "🇮🇳",
  LGEBN: "🇳🇱", Global: "🌍",
};

/** ISO2 코드를 LGE 법인 코드로 변환 (Global은 그대로 유지) */
function toLgeCode(iso: string): string {
  if (iso === "Global") return "Global";
  return ISO_TO_LGE[iso] || iso;
}

/* ── source label map ── */
function sourceLabel(source: string): string {
  if (source.startsWith("amazon")) return "Amazon";
  if (source.startsWith("youtube")) return "YouTube";
  if (source.startsWith("bestbuy")) return "Best Buy";
  if (source.startsWith("walmart")) return "Walmart";
  if (source.startsWith("shopee")) return "Shopee";
  if (source.startsWith("lazada")) return "Lazada";
  if (source.startsWith("trustpilot")) return "Trustpilot";
  if (source.startsWith("web_review")) return "Web Reviews";
  return source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── basic stats hook — splits by channel × country ── */
function useBasicStats(country: string, range: "all" | "weekly") {
  const sourcesFilter = countryToSourceFilter(country);
  return useQuery({
    queryKey: ["community-basic-stats-v2", country, range],
    queryFn: async () => {
      const baseQuery = () => {
        let q = supabase
          .from("reviews")
          .select("source, sentiment", { count: "exact" })
          .not("source", "like", "lge_com%")
          .not("source", "like", "reddit%")
          .limit(5000);
        if (sourcesFilter && sourcesFilter.length > 0) {
          q = q.in("source", sourcesFilter);
        }
        return q;
      };

      let data: any[] | null = null;
      let count: number | null = null;

      if (range === "weekly") {
        const week = await baseQuery().gte("published_at", getSinceISO(7));
        if (week.error) throw week.error;
        if ((week.count || 0) < WEEKLY_MIN_REVIEWS) {
          const month = await baseQuery().gte("published_at", getSinceISO(30));
          if (month.error) throw month.error;
          data = month.data;
          count = month.count;
        } else {
          data = week.data;
          count = week.count;
        }
      } else {
        const all = await baseQuery();
        if (all.error) throw all.error;
        data = all.data;
        count = all.count;
      }

      // Group by channel × country (key = "Channel|Country")
      const byKey: Record<string, { channel: string; country: string; total: number; positive: number; negative: number }> = {};
      for (const r of data || []) {
        const ch = sourceLabel(r.source);
        const co = toLgeCode(inferCountryFromSource(r.source));
        const key = ch + "|" + co;
        if (!byKey[key]) byKey[key] = { channel: ch, country: co, total: 0, positive: 0, negative: 0 };
        byKey[key].total++;
        if (r.sentiment === "positive") byKey[key].positive++;
        if (r.sentiment === "negative") byKey[key].negative++;
      }

      // Threshold: smaller (15) since we now split per-country
      const THRESHOLD = 15;
      const mainChannels: { name: string; channel: string; country: string; total: number; positive: number; negative: number }[] = [];
      let etcTotal = 0, etcPos = 0, etcNeg = 0;

      for (const v of Object.values(byKey)) {
        if (v.total >= THRESHOLD) {
          mainChannels.push({
            name: v.channel + " " + v.country,
            channel: v.channel,
            country: v.country,
            total: v.total,
            positive: v.positive,
            negative: v.negative,
          });
        } else {
          etcTotal += v.total;
          etcPos += v.positive;
          etcNeg += v.negative;
        }
      }

      if (etcTotal > 0) {
        mainChannels.push({
          name: "기타",
          channel: "기타",
          country: "Global",
          total: etcTotal,
          positive: etcPos,
          negative: etcNeg,
        });
      }

      return {
        channels: mainChannels.sort((a, b) => b.total - a.total),
        total: count || (data?.length ?? 0),
      };
    },
    staleTime: 60_000,
  });
}

/* ── AI insights with 30-min cache (useQuery auto-trigger) ── */
function useAutoInsights(country: string, range: "all" | "weekly", hasData: boolean) {
  return useQuery<InsightsResponse>({
    queryKey: ["community-insights", country, range],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-community-insights", {
        body: { country, range },
      });
      if (error) throw error;
      return data as InsightsResponse;
    },
    enabled: hasData,
    staleTime: CACHE_TTL,
    gcTime: CACHE_TTL * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/* ── Channel Insight Card ── */
function ChannelInsightCard({ insight }: { insight: ChannelInsight }) {
  return (
    <div className="gradient-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold font-heading">{insight.channel}</h3>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {insight.reviewCount.toLocaleString()}건 분석
        </Badge>
      </div>

      <div className="space-y-3">
        {insight.products.map((product) => (
          <div key={product.rank} className="rounded-lg border border-border bg-background/50 p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {product.rank}
              </span>
              <span className="text-xs font-semibold text-foreground">{product.name}</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">{product.category}</Badge>
              <span className="text-[10px] text-muted-foreground ml-auto">{product.mentions}건</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <ThumbsUp className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <p className="text-xs text-foreground leading-relaxed">{maskCompetitorNames(product.positiveInsight)}</p>
              </div>
              <div className="flex items-start gap-2">
                <ThumbsDown className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-foreground leading-relaxed">{maskCompetitorNames(product.negativeInsight)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {insight.takeaway && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">This Week's Takeaway</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-3 w-3 text-success mt-0.5 shrink-0" />
              <p className="text-[11px] text-foreground leading-relaxed">{maskCompetitorNames(insight.takeaway.momentum)}</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-foreground leading-relaxed">{maskCompetitorNames(insight.takeaway.friction)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Community-only country counts (exclude LG.com & Reddit) ── */
const SOURCE_COUNTRY: Record<string, string> = {
  amazon: "US", amazon_us: "US", amazon_uk: "UK", amazon_ca: "CA", amazon_de: "DE",
  amazon_fr: "FR", amazon_au: "AU", amazon_br: "BR", amazon_mx: "MX", amazon_jp: "JP",
  amazon_sg: "SG", amazon_in: "IN",
  youtube: "US", youtube_us: "US", youtube_LGUSAChannel: "US",
  youtube_uk: "UK", youtube_ca: "CA", youtube_de: "DE", youtube_fr: "FR", youtube_au: "AU",
  youtube_br: "BR", youtube_jp: "JP", youtube_sg: "SG", youtube_my: "MY", youtube_th: "TH",
  youtube_ph: "PH", youtube_id: "ID", youtube_vn: "VN", youtube_tw: "TW", youtube_hk: "HK", youtube_in: "IN",
  web_review_br: "BR",
  bestbuy: "US", walmart: "US", costco: "US", target: "US",
  consumeraffairs: "US", consumer_reports: "US", bestreviews: "US", houzz: "US",
  web_review: "US", web_review_jp: "JP", web_review_th: "TH", web_review_in: "IN",
  web_review_sg: "SG", web_review_id: "ID", web_review_vn: "VN", web_review_hk: "HK", web_review_tw: "TW",
  trusted_reviews: "UK",
  trustpilot: "Global", rtings: "Global", pcmag: "Global", cnet: "Global",
  techradar: "Global", notebookcheck: "Global", lemon8: "Global",
};

/** Infer country from a raw source string when not in the explicit map */
function inferCountryFromSource(source: string): string {
  if (SOURCE_COUNTRY[source]) return SOURCE_COUNTRY[source];
  // Suffix-based inference for sources like web_review_xx, youtube_xx, amazon_xx, shopee_xx, lazada_xx
  const m = source.match(/_([a-z]{2})$/i);
  if (m) {
    const code = m[1].toUpperCase();
    const valid = ["US","UK","CA","DE","FR","AU","BR","MX","JP","SG","MY","TH","PH","ID","VN","TW","HK","IN"];
    if (valid.includes(code)) return code;
  }
  // Known US-centric channels without country suffix
  if (/^(amazon|youtube|bestbuy|walmart|costco|target|consumeraffairs|consumer_reports|bestreviews|houzz|web_review)$/.test(source)) {
    return "US";
  }
  if (source === "trusted_reviews") return "UK";
  return "Global";
}

function useCommunityCountryCounts() {
  return useQuery({
    queryKey: ["community-country-counts-v2"],
    queryFn: async () => {
      // Direct aggregation from reviews to preserve per-country source granularity
      // (get_source_counts collapses web_review_xx into a single bucket)
      const { data, error } = await supabase
        .from("reviews")
        .select("source")
        .not("source", "like", "lge_com%")
        .not("source", "like", "reddit%")
        .limit(20000);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const r of data || []) {
        const country = inferCountryFromSource(r.source);
        counts[country] = (counts[country] || 0) + 1;
      }
      return counts;
    },
    staleTime: 60_000,
  });
}

/* ── Main Page ── */
const CommunitiesPage = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [range, setRange] = useState<"all" | "weekly">("all");
  const { data: communityCounts } = useCommunityCountryCounts();
  // Channel stats always show cumulative totals
  const { data: stats, isLoading: statsLoading } = useBasicStats(selectedCountry, range);
  // AI insights respect the range toggle

  const hasData = !statsLoading && !!stats && stats.channels.length > 0;
  const { data: insights, isLoading: insightsLoading, refetch } = useAutoInsights(selectedCountry, range, hasData);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Globe}
        title="🌐 Community Weekly Insights"
        description="Amazon, YouTube, Best Buy, Shopee, Lazada 등 외부 커뮤니티 리뷰를 AI가 분석하여 채널별 Top 3 제품의 긍정·부정 인사이트 문장과 마케터용 Weekly Key Findings를 생성합니다."
      />

      <CountryFilterBar selected={selectedCountry} onChange={setSelectedCountry} customCounts={communityCounts ?? null} />

      {statsLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !stats || stats.channels.length === 0 ? (
        <div className="gradient-card rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
          {selectedCountry !== "all"
            ? `${selectedCountry} 지역의 수집 데이터가 아직 없습니다.`
            : "LG.com, Reddit 이외 채널의 수집 데이터가 아직 없습니다."}
        </div>
      ) : (
        <>
          {/* Channel Stats Bar */}
          <div className="gradient-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Globe className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold font-heading">채널별 리뷰 현황</h4>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">채널×국가 분리 · 15건 미만 기타 통합</Badge>
              {range === "weekly" && (
                <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary bg-primary/5" title="이번 주(최근 7일) 작성 리뷰 기준. 30건 미만이면 최근 30일로 자동 폴백.">
                  {stats.total < WEEKLY_MIN_REVIEWS ? "⚠️ 1개월 폴백" : "📅 이번 주 작성"} · {stats.total.toLocaleString()}건
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px] ml-auto">
                Total {stats.total.toLocaleString()}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.channels.map((ch) => {
                const posP = ch.total ? Math.round((ch.positive / ch.total) * 100) : 0;
                const flag = LGE_FLAGS[ch.country] || "🌐";
                return (
                  <div
                    key={ch.name}
                    className="rounded-lg border border-border bg-background/50 px-4 py-2.5 min-w-[170px]"
                    title={`${ch.channel} · ${ch.country}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm leading-none">{flag}</span>
                      <span className="text-xs font-semibold text-foreground">{ch.channel}</span>
                      {ch.country !== "Global" && ch.channel !== "기타" && (
                        <span className="text-[9px] font-medium text-muted-foreground bg-secondary/60 px-1 rounded">{ch.country}</span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-primary">{ch.total.toLocaleString()}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span className="flex items-center gap-0.5 text-success">
                        <ThumbsUp className="h-2.5 w-2.5" />
                        {ch.positive.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-0.5 text-destructive">
                        <ThumbsDown className="h-2.5 w-2.5" />
                        {ch.negative.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground ml-auto">긍정 {posP}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden flex bg-secondary mt-1">
                      <div className="bg-success h-full" style={{ width: `${posP}%` }} />
                      <div className="bg-destructive h-full" style={{ width: `${100 - posP}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insights Header with Range Toggle + Refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">📊 커뮤니티 리뷰 {range === "weekly" ? "주간" : "전체"} 인사이트</h3>
              {insights && !insightsLoading && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                  30분 캐시 적용
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                <button
                  onClick={() => setRange("weekly")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    range === "weekly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >주간</button>
                <button
                  onClick={() => setRange("all")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    range === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >전체</button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={insightsLoading}
                className="gap-1.5"
              >
                {insightsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                새로고침
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {insightsLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">AI가 리뷰를 분석하고 있습니다... (30초~1분 소요)</p>
            </div>
          )}

          {/* Executive Summary */}
          {insights && insights.executiveSummary && insights.executiveSummary.length > 0 && !insightsLoading && (
            <div className="gradient-card rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold font-heading text-primary">주간 Executive Summary</h3>
              </div>
              <div className="space-y-2">
                {insights.executiveSummary.map((line, i) => {
                  const item: SummaryLine = typeof line === "string"
                    ? { category: "", insight: line }
                    : line;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      {item.category && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 mt-0.5 min-w-[52px] justify-center">
                          {item.category}
                        </Badge>
                      )}
                      <p className="text-xs leading-relaxed text-foreground">{item.insight}</p>
                    </div>
                  );
                })}
              </div>
              {insights.keyTakeaway && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mt-2">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Key Takeaway</span>
                      <p className="text-xs leading-relaxed text-foreground mt-0.5">{insights.keyTakeaway}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Insights Grid */}
          {insights && insights.channels && insights.channels.length > 0 && !insightsLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {insights.channels.map((ch) => (
                <ChannelInsightCard key={ch.channel} insight={ch} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommunitiesPage;
