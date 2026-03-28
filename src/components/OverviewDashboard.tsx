import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourceCounts } from "@/hooks/useProductData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, MessageSquare, Star, ArrowRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

/* ───── hooks ───── */

function useOverviewKPIs() {
  const { data: sourceCounts } = useSourceCounts();

  return useQuery({
    queryKey: ["overview-kpis", sourceCounts],
    queryFn: async () => {
      // Total reviews
      const { count: totalReviews } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true });

      // Weekly reviews (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: weeklyReviews } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .gte("collected_at", weekAgo.toISOString());

      // Sentiment avg
      const { data: sentimentData } = await supabase
        .from("reviews")
        .select("sentiment_score")
        .not("sentiment_score", "is", null)
        .limit(1000);

      const scores = (sentimentData || []).map((r) => r.sentiment_score!);
      const avgSentiment = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
        : 0;

      // Reddit VOC count
      const { count: redditVoc } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("source", "reddit");

      // P0 alerts (negative reviews with low score)
      const { count: p0Alerts } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("sentiment", "negative")
        .lt("sentiment_score", 0.3);

      const lgcomCount = sourceCounts?.["lge_com"] || 0;
      const redditCount = sourceCounts?.["reddit"] || 0;

      return {
        sentiment: avgSentiment,
        totalReviews: totalReviews || 0,
        weeklyReviews: weeklyReviews || 0,
        redditVoc: redditVoc || 0,
        p0Alerts: p0Alerts || 0,
        lgcomCount,
        redditCount,
      };
    },
    staleTime: 60_000,
  });
}

function useTopProducts() {
  return useQuery({
    queryKey: ["overview-top-products"],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data } = await supabase
        .from("reviews")
        .select("product_id, sentiment, sentiment_score, products!inner(model_number, display_name, category)")
        .gte("collected_at", weekAgo.toISOString())
        .limit(1000);

      if (!data || data.length === 0) return [];

      // Group by product
      const productMap: Record<string, {
        id: string;
        model: string;
        display: string;
        category: string;
        count: number;
        posCount: number;
        negCount: number;
        avgScore: number;
        scores: number[];
        topKeywords: string[];
      }> = {};

      for (const r of data as any[]) {
        const pid = r.product_id;
        if (!productMap[pid]) {
          productMap[pid] = {
            id: pid,
            model: r.products.model_number,
            display: r.products.display_name,
            category: r.products.category,
            count: 0,
            posCount: 0,
            negCount: 0,
            avgScore: 0,
            scores: [],
            topKeywords: [],
          };
        }
        const p = productMap[pid];
        p.count++;
        if (r.sentiment === "positive") p.posCount++;
        if (r.sentiment === "negative") p.negCount++;
        if (r.sentiment_score != null) p.scores.push(r.sentiment_score);
      }

      const products = Object.values(productMap).map((p) => ({
        ...p,
        avgScore: p.scores.length > 0
          ? Math.round((p.scores.reduce((a, b) => a + b, 0) / p.scores.length) * 100)
          : 50,
      }));

      products.sort((a, b) => b.count - a.count);
      return products.slice(0, 3);
    },
    staleTime: 60_000,
  });
}

function useChannelPerformance() {
  return useQuery({
    queryKey: ["overview-channel-perf"],
    queryFn: async () => {
      // LG.com sentiment breakdown
      const { data: lgReviews } = await supabase
        .from("reviews")
        .select("sentiment, sentiment_score")
        .eq("source", "lge_com")
        .limit(1000);

      const lgTotal = lgReviews?.length || 0;
      const lgPos = lgReviews?.filter((r) => r.sentiment === "positive").length || 0;
      const lgNeg = lgReviews?.filter((r) => r.sentiment === "negative").length || 0;
      const lgNeutral = lgTotal - lgPos - lgNeg;

      // LG.com top positive keywords from trending_keywords
      const { data: lgKeywords } = await supabase
        .from("trending_keywords")
        .select("keyword, count, sentiment")
        .eq("source", "lge_com")
        .eq("sentiment", "positive")
        .order("count", { ascending: false })
        .limit(3);

      // Reddit breakdown by review_type
      const { data: redditReviews } = await supabase
        .from("reviews")
        .select("review_type, sentiment")
        .eq("source", "reddit")
        .limit(1000);

      const redditTotal = redditReviews?.length || 0;
      const redditReviewCount = redditReviews?.filter((r) => r.review_type === "REVIEW").length || 0;
      const redditVocCount = redditReviews?.filter((r) => r.review_type === "VOC").length || 0;
      const redditQuestionCount = redditReviews?.filter((r) => r.review_type === "QUESTION").length || 0;

      // Reddit pain points from trending_keywords
      const { data: redditPainPoints } = await supabase
        .from("trending_keywords")
        .select("keyword, count, sentiment")
        .eq("source", "reddit")
        .eq("sentiment", "negative")
        .order("count", { ascending: false })
        .limit(3);

      return {
        lgcom: {
          total: lgTotal,
          positive: lgPos,
          negative: lgNeg,
          neutral: lgNeutral,
          posPct: lgTotal > 0 ? Math.round((lgPos / lgTotal) * 100) : 0,
          negPct: lgTotal > 0 ? Math.round((lgNeg / lgTotal) * 100) : 0,
          neutralPct: lgTotal > 0 ? Math.round((lgNeutral / lgTotal) * 100) : 0,
          topKeywords: (lgKeywords || []).map((k) => ({ keyword: k.keyword, count: k.count })),
        },
        reddit: {
          total: redditTotal,
          reviewCount: redditReviewCount,
          vocCount: redditVocCount,
          questionCount: redditQuestionCount,
          painPoints: (redditPainPoints || []).map((k) => ({ keyword: k.keyword, count: k.count })),
        },
      };
    },
    staleTime: 60_000,
  });
}

function useVocSpotlight() {
  return useQuery({
    queryKey: ["overview-voc-spotlight"],
    queryFn: async () => {
      // Positive highlight reviews
      const { data: posReviews } = await supabase
        .from("reviews")
        .select("content, author, source, sentiment, rating, published_at, products!inner(model_number, display_name)")
        .eq("sentiment", "positive")
        .gte("sentiment_score", 0.8)
        .neq("source", "lge_com")
        .order("published_at", { ascending: false })
        .limit(2);

      // Negative / urgent reviews
      const { data: negReviews } = await supabase
        .from("reviews")
        .select("content, author, source, sentiment, review_type, rating, published_at, products!inner(model_number, display_name)")
        .eq("sentiment", "negative")
        .order("sentiment_score", { ascending: true })
        .limit(2);

      return {
        positive: (posReviews || []).map((r: any) => ({
          content: r.content?.slice(0, 120) + (r.content?.length > 120 ? "..." : ""),
          author: r.author || "Anonymous",
          source: r.source,
          product: r.products?.display_name || r.products?.model_number,
          rating: r.rating,
          date: r.published_at?.split("T")[0],
          type: "REVIEW" as const,
        })),
        negative: (negReviews || []).map((r: any) => ({
          content: r.content?.slice(0, 120) + (r.content?.length > 120 ? "..." : ""),
          author: r.author || "Anonymous",
          source: r.source,
          product: r.products?.display_name || r.products?.model_number,
          rating: r.rating,
          date: r.published_at?.split("T")[0],
          type: (r.review_type === "VOC" ? "VOC · URGENT" : r.review_type || "VOC") as string,
        })),
      };
    },
    staleTime: 60_000,
  });
}

/* ───── Component ───── */

export function OverviewDashboard() {
  const { t } = useLang();
  const { data: kpis } = useOverviewKPIs();
  const { data: topProducts } = useTopProducts();
  const { data: channelPerf } = useChannelPerformance();
  const { data: vocSpotlight } = useVocSpotlight();

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 bg-primary rounded-full" />
        <h2 className="text-sm font-bold tracking-widest uppercase text-foreground">
          Overview
        </h2>
        <Badge variant="outline" className="text-[10px] ml-1 border-primary/30 text-primary font-semibold">
          WEEKLY
        </Badge>
      </div>

      {/* ─── KPI Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="SENTIMENT"
          value={kpis?.sentiment ?? "—"}
          sub={`누적 ${kpis?.totalReviews?.toLocaleString() ?? "—"}건`}
        />
        <KPICard
          label="TOTAL REVIEWS"
          value={kpis?.weeklyReviews?.toLocaleString() ?? "—"}
          sub={`LG.com ${kpis?.lgcomCount?.toLocaleString() ?? "—"} · Reddit ${kpis?.redditCount?.toLocaleString() ?? "—"}`}
        />
        <KPICard
          label="REDDIT VOC"
          value={kpis?.redditVoc?.toLocaleString() ?? "—"}
          sub="레딧 리뷰 수"
        />
        <KPICard
          label="P0 ALERTS"
          value={kpis?.p0Alerts ?? "—"}
          sub="부정 감성 경고"
          alert={!!kpis?.p0Alerts && kpis.p0Alerts > 0}
        />
      </div>

      {/* ─── TOP 3 ACTIONS THIS WEEK ─── */}
      <div>
        <SectionTitle title="TOP 3 ACTIONS THIS WEEK" />
        <div className="space-y-3">
          {topProducts && topProducts.length > 0 ? topProducts.map((product, i) => (
            <Card key={product.id} className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start gap-4">
                {/* Rank */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground ${
                  i === 0 ? "bg-primary" : i === 1 ? "bg-primary/70" : "bg-muted-foreground"
                }`}>
                  {i + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm text-foreground">
                      {product.display || product.model}
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-mono">{product.model}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {product.count}건 리뷰 · 긍정 {product.posCount}건 · 부정 {product.negCount}건 · {product.category}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                      CIS {product.avgScore}
                    </Badge>
                    {product.posCount > product.negCount ? (
                      <Badge variant="outline" className="text-[9px] border-success/30 text-success">
                        <TrendingUp className="h-3 w-3 mr-0.5" /> Positive trend
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive">
                        <TrendingDown className="h-3 w-3 mr-0.5" /> Needs attention
                      </Badge>
                    )}
                  </div>
                </div>

                {/* CIS Score */}
                <div className="flex-shrink-0 text-right">
                  <div className={`text-xs font-bold px-2.5 py-1 rounded ${
                    product.avgScore >= 70 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>
                    CIS {product.avgScore}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Priority {i}</p>
                </div>
              </CardContent>
            </Card>
          )) : (
            <p className="text-sm text-muted-foreground py-4">데이터를 불러오는 중...</p>
          )}
        </div>
      </div>

      {/* ─── CHANNEL PERFORMANCE ─── */}
      <div>
        <SectionTitle title="CHANNEL PERFORMANCE" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LG.com Card */}
          <Card className="border border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="font-semibold text-sm text-foreground">LG.com · {channelPerf?.lgcom.total.toLocaleString()} reviews</span>
              </div>

              {/* Sentiment bar */}
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Sentiment split</p>
              <div className="flex h-2.5 rounded-full overflow-hidden mb-2">
                <div className="bg-success" style={{ width: `${channelPerf?.lgcom.posPct || 0}%` }} />
                <div className="bg-muted" style={{ width: `${channelPerf?.lgcom.neutralPct || 0}%` }} />
                <div className="bg-destructive" style={{ width: `${channelPerf?.lgcom.negPct || 0}%` }} />
              </div>
              <div className="flex justify-between text-[10px] mb-4">
                <span className="text-success font-semibold">{channelPerf?.lgcom.posPct}% positive</span>
                <span className="text-muted-foreground">{channelPerf?.lgcom.neutralPct}% neutral</span>
                <span className="text-destructive font-semibold">{channelPerf?.lgcom.negPct}% neg</span>
              </div>

              {/* Top positive keywords */}
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">TOP POSITIVE</p>
              <div className="space-y-1.5">
                {channelPerf?.lgcom.topKeywords.map((kw) => (
                  <div key={kw.keyword} className="flex items-center gap-2">
                    <span className="text-xs text-foreground w-28 truncate">{kw.keyword}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full"
                        style={{ width: `${Math.min(100, (kw.count / (channelPerf?.lgcom.topKeywords[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">{kw.count}</span>
                  </div>
                ))}
                {(!channelPerf?.lgcom.topKeywords || channelPerf.lgcom.topKeywords.length === 0) && (
                  <p className="text-xs text-muted-foreground">No keyword data</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reddit Card */}
          <Card className="border border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                <span className="font-semibold text-sm text-foreground">Reddit · {channelPerf?.reddit.total.toLocaleString()} signals</span>
              </div>

              {/* Bucket counts */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "REVIEW", count: channelPerf?.reddit.reviewCount || 0, color: "text-primary" },
                  { label: "VOC", count: channelPerf?.reddit.vocCount || 0, color: "text-warning" },
                  { label: "QUESTION", count: channelPerf?.reddit.questionCount || 0, color: "text-foreground" },
                ].map((b) => (
                  <div key={b.label} className="border border-border rounded-lg p-2.5 text-center">
                    <p className={`text-lg font-bold ${b.color}`}>{b.count.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{b.label}</p>
                  </div>
                ))}
              </div>

              {/* Pain point tags */}
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">PAIN POINT TAGS</p>
              <div className="space-y-1.5">
                {channelPerf?.reddit.painPoints.map((pp, i) => (
                  <div key={pp.keyword} className="flex items-center gap-2">
                    <span className="text-xs text-foreground w-28 truncate">{pp.keyword}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${i === 0 ? "bg-destructive" : i === 1 ? "bg-destructive/70" : "bg-warning"}`}
                        style={{ width: `${Math.min(100, (pp.count / (channelPerf?.reddit.painPoints[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">{pp.count}</span>
                  </div>
                ))}
                {(!channelPerf?.reddit.painPoints || channelPerf.reddit.painPoints.length === 0) && (
                  <p className="text-xs text-muted-foreground">No pain point data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── VOC SPOTLIGHT ─── */}
      <div>
        <SectionTitle title="VOC SPOTLIGHT — READY TO USE IN COPY" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vocSpotlight?.positive.map((voc, i) => (
            <VocCard key={`pos-${i}`} voc={voc} variant="positive" />
          ))}
          {vocSpotlight?.negative.map((voc, i) => (
            <VocCard key={`neg-${i}`} voc={voc} variant="negative" />
          ))}
          {(!vocSpotlight || (vocSpotlight.positive.length === 0 && vocSpotlight.negative.length === 0)) && (
            <p className="text-sm text-muted-foreground col-span-2 py-4">VOC 데이터를 불러오는 중...</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── Sub-components ───── */

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 bg-primary rounded-full" />
      <h3 className="text-xs font-bold tracking-widest uppercase text-foreground">{title}</h3>
    </div>
  );
}

function KPICard({ label, value, sub, alert }: { label: string; value: string | number; sub: string; alert?: boolean }) {
  return (
    <Card className={`border bg-card ${alert ? "border-destructive/40" : "border-border"}`}>
      <CardContent className="p-4 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">{label}</p>
        <p className={`text-3xl font-bold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function VocCard({ voc, variant }: {
  voc: { content: string; author: string; source: string; product: string; rating?: number | null; date?: string; type: string };
  variant: "positive" | "negative";
}) {
  const isPositive = variant === "positive";
  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-4">
        <Badge className={`text-[9px] mb-2 ${
          isPositive
            ? "bg-success/10 text-success border-success/20"
            : "bg-destructive/10 text-destructive border-destructive/20"
        }`}>
          {voc.type}
        </Badge>
        <p className="text-sm font-medium text-foreground italic leading-relaxed mb-3">
          "{voc.content}"
        </p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {voc.source === "lge_com" ? "LG.com" : voc.source} · {voc.product}
            {voc.rating ? ` · ${voc.rating}★` : ""}
          </span>
          {voc.date && <span>{voc.date}</span>}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <ArrowRight className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-primary font-semibold">
            {isPositive ? "PDP Hero · Amazon A+" : "CRM escalate within 48h"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
