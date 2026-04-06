import { useState } from "react";
import { Globe, Loader2, ThumbsUp, ThumbsDown, TrendingUp, AlertTriangle, Sparkles, RefreshCw, BarChart3, Lightbulb } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountryFilterBar, countryToSourceFilter } from "@/components/CountryFilterBar";

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

/* ── source label map (for basic stats) ── */
function sourceLabel(source: string): string {
  if (source.startsWith("amazon")) return "Amazon";
  if (source.startsWith("youtube")) return "YouTube";
  if (source.startsWith("bestbuy")) return "Best Buy";
  if (source.startsWith("walmart")) return "Walmart";
  if (source.startsWith("shopee")) return "Shopee";
  if (source.startsWith("lazada")) return "Lazada";
  if (source.startsWith("trustpilot")) return "Trustpilot";
  return source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── basic stats hook (fast, no AI) ── */
function useBasicStats(country: string) {
  const sourcesFilter = countryToSourceFilter(country);
  return useQuery({
    queryKey: ["community-basic-stats", country],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("source, sentiment", { count: "exact" })
        .not("source", "like", "lge_com%")
        .not("source", "like", "reddit%")
        .limit(1000);
      if (sourcesFilter && sourcesFilter.length > 0) {
        query = query.in("source", sourcesFilter);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      const byChannel: Record<string, { total: number; positive: number; negative: number }> = {};
      for (const r of data || []) {
        const ch = sourceLabel(r.source);
        if (!byChannel[ch]) byChannel[ch] = { total: 0, positive: 0, negative: 0 };
        byChannel[ch].total++;
        if (r.sentiment === "positive") byChannel[ch].positive++;
        if (r.sentiment === "negative") byChannel[ch].negative++;
      }
      return {
        channels: Object.entries(byChannel)
          .map(([name, s]) => ({ name, ...s }))
          .filter((ch) => ch.total >= 50)
          .sort((a, b) => b.total - a.total),
        total: count || (data?.length ?? 0),
      };
    },
    staleTime: 60_000,
  });
}

/* ── AI insights mutation ── */
function useGenerateInsights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (country: string): Promise<InsightsResponse> => {
      const { data, error } = await supabase.functions.invoke("generate-community-insights", {
        body: { country },
      });
      if (error) throw error;
      return data as InsightsResponse;
    },
    onSuccess: (data, country) => {
      queryClient.setQueryData(["community-insights", country], data);
    },
  });
}

/* ── Channel Insight Card ── */
function ChannelInsightCard({ insight }: { insight: ChannelInsight }) {
  return (
    <div className="gradient-card rounded-xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold font-heading">{insight.channel}</h3>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {insight.reviewCount.toLocaleString()}건 분석
        </Badge>
      </div>

      {/* Products */}
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
                <p className="text-xs text-foreground leading-relaxed">{product.positiveInsight}</p>
              </div>
              <div className="flex items-start gap-2">
                <ThumbsDown className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-foreground leading-relaxed">{product.negativeInsight}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Takeaway */}
      {insight.takeaway && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">This Week's Takeaway</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-3 w-3 text-success mt-0.5 shrink-0" />
              <p className="text-[11px] text-foreground leading-relaxed">{insight.takeaway.momentum}</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-foreground leading-relaxed">{insight.takeaway.friction}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
const CommunitiesPage = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const { data: stats, isLoading: statsLoading } = useBasicStats(selectedCountry);
  const { mutate: generateInsights, isPending: insightsLoading } = useGenerateInsights();
  const queryClient = useQueryClient();
  const insights = queryClient.getQueryData<InsightsResponse>(["community-insights", selectedCountry]);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Globe}
        title="🌐 Community Weekly Insights"
        description="Amazon, YouTube, Best Buy, Shopee, Lazada 등 외부 커뮤니티 리뷰를 AI가 분석하여 채널별 Top 3 제품의 긍정·부정 인사이트 문장과 마케터용 주간 테이크어웨이를 생성합니다."
      />

      <CountryFilterBar selected={selectedCountry} onChange={setSelectedCountry} />

      {/* Quick Stats Bar */}
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
          {/* Overview bar */}
          <div className="gradient-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold font-heading">채널별 리뷰 현황</h4>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">누적 기준</Badge>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                Total {stats.total.toLocaleString()}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.channels.map((ch) => {
                const posP = ch.total ? Math.round((ch.positive / ch.total) * 100) : 0;
                return (
                  <div
                    key={ch.name}
                    className="rounded-lg border border-border bg-background/50 px-4 py-2.5 min-w-[160px]"
                  >
                    <div className="text-xs font-semibold text-foreground">{ch.name}</div>
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
                      <span className="text-muted-foreground ml-auto">
                        긍정 {posP}%
                      </span>
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

          {/* Generate Insights Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">📊 커뮤니티 리뷰 주간 인사이트</h3>
            <Button
              size="sm"
              variant={insights ? "outline" : "default"}
              onClick={() => generateInsights(selectedCountry)}
              disabled={insightsLoading}
              className="gap-1.5"
            >
              {insightsLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {insights ? "인사이트 새로고침" : "AI 인사이트 생성"}
            </Button>
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
              {/* Key Takeaway */}
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

          {/* No insights yet prompt */}
          {!insights && !insightsLoading && (
            <div className="gradient-card rounded-xl border border-border border-dashed p-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                "AI 인사이트 생성" 버튼을 클릭하면 채널별 Top 3 제품 인사이트가 생성됩니다.
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                최근 7일 리뷰를 기반으로 분석합니다
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommunitiesPage;
