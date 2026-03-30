import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourceCounts } from "@/hooks/useProductData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowRight, ArrowUpRight, ArrowDownRight, Copy, Check, Store, MessageSquare, Wrench, HelpCircle } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ───── hooks ───── */

function useOverviewKPIs() {
  const { data: sourceCounts } = useSourceCounts();

  return useQuery({
    queryKey: ["overview-kpis-v2", sourceCounts],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Total reviews
      const { count: totalReviews } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true });

      // This week reviews
      const { count: thisWeekReviews } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .gte("collected_at", weekAgo.toISOString());

      // Last week reviews (for WoW)
      const { count: lastWeekReviews } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .gte("collected_at", twoWeeksAgo.toISOString())
        .lt("collected_at", weekAgo.toISOString());

      // LG.com counts
      const { count: lgcomTotal } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .like("source", "lge_com%");

      const { count: lgcomWeekly } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .like("source", "lge_com%")
        .gte("collected_at", weekAgo.toISOString());

      const { count: lgcomLastWeek } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .like("source", "lge_com%")
        .gte("collected_at", twoWeeksAgo.toISOString())
        .lt("collected_at", weekAgo.toISOString());

      // Reddit counts
      const { count: redditTotal } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("source", "reddit");

      const { count: redditWeekly } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("source", "reddit")
        .gte("collected_at", weekAgo.toISOString());

      const { count: redditLastWeek } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("source", "reddit")
        .gte("collected_at", twoWeeksAgo.toISOString())
        .lt("collected_at", weekAgo.toISOString());

      // Community (everything except lge_com and reddit)
      const allSources = sourceCounts || {};
      let communityTotal = 0;
      for (const [src, cnt] of Object.entries(allSources)) {
        if (src !== "lge_com" && src !== "reddit") {
          communityTotal += cnt;
        }
      }

      // Community weekly - approximate by subtracting lgcom + reddit from total weekly
      const communityWeekly = Math.max(0, (thisWeekReviews || 0) - (lgcomWeekly || 0) - (redditWeekly || 0));
      const communityLastWeek = Math.max(0, (lastWeekReviews || 0) - (lgcomLastWeek || 0) - (redditLastWeek || 0));

      const calcWow = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        total: {
          cumulative: totalReviews || 0,
          weekly: thisWeekReviews || 0,
          wow: calcWow(thisWeekReviews || 0, lastWeekReviews || 0),
        },
        lgcom: {
          cumulative: lgcomTotal || 0,
          weekly: lgcomWeekly || 0,
          wow: calcWow(lgcomWeekly || 0, lgcomLastWeek || 0),
        },
        reddit: {
          cumulative: redditTotal || 0,
          weekly: redditWeekly || 0,
          wow: calcWow(redditWeekly || 0, redditLastWeek || 0),
        },
        community: {
          cumulative: communityTotal,
          weekly: communityWeekly,
          wow: calcWow(communityWeekly, communityLastWeek),
        },
      };
    },
    staleTime: 60_000,
  });
}

function useTopActions() {
  return useQuery({
    queryKey: ["overview-top-actions-v2"],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data } = await supabase
        .from("reviews")
        .select("product_id, sentiment, sentiment_score, content, source, products!inner(model_number, display_name, category)")
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
        scores: number[];
        posSnippets: string[];
        negSnippets: string[];
        posKeywords: Record<string, number>;
        negKeywords: Record<string, number>;
        sources: Set<string>;
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
            scores: [],
            posSnippets: [],
            negSnippets: [],
            posKeywords: {} as Record<string, number>,
            negKeywords: {} as Record<string, number>,
            sources: new Set(),
          };
        }
        const p = productMap[pid];
        p.count++;
        p.sources.add(r.source);

        // Extract simple keywords from content
        const extractKws = (text: string): string[] => {
          const stops = new Set(["the","a","an","is","was","are","were","it","its","i","my","and","or","but","to","of","in","for","on","with","this","that","very","so","not","no","has","have","had","been","be","do","does","did","will","would","can","could","just","also","from","at","by","as","all","they","them","we","our","you","your","he","she","her","his"]);
          return text.toLowerCase()
            .replace(/[^a-z가-힣\s]/g, " ")
            .split(/\s+/)
            .filter(w => w.length > 2 && !stops.has(w));
        };

        if (r.sentiment === "positive") {
          p.posCount++;
          if (p.posSnippets.length < 2 && r.content) p.posSnippets.push(r.content.slice(0, 80));
          if (r.content) {
            for (const kw of extractKws(r.content)) {
              p.posKeywords[kw] = (p.posKeywords[kw] || 0) + 1;
            }
          }
        }
        if (r.sentiment === "negative") {
          p.negCount++;
          if (p.negSnippets.length < 2 && r.content) p.negSnippets.push(r.content.slice(0, 80));
          if (r.content) {
            for (const kw of extractKws(r.content)) {
              p.negKeywords[kw] = (p.negKeywords[kw] || 0) + 1;
            }
          }
        }
        if (r.sentiment_score != null) p.scores.push(r.sentiment_score);
      }

      const products = Object.values(productMap).map((p) => {
        const avgScore = p.scores.length > 0
          ? Math.round((p.scores.reduce((a, b) => a + b, 0) / p.scores.length) * 100)
          : 50;

        // Top keywords extraction
        const topPos = Object.entries(p.posKeywords).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
        const topNeg = Object.entries(p.negKeywords).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
        const catLabel = p.category || "General";
        const nameLabel = p.display || p.model;

        // Generate action summary with category, name, keywords (max 3 lines)
        let actionSummary = "";
        if (p.negCount > p.posCount) {
          const negKwStr = topNeg.length > 0 ? `주요 부정 키워드: ${topNeg.join(", ")}` : "";
          actionSummary = `[${catLabel}] ${nameLabel} — 부정 리뷰 ${p.negCount}건 집중. ${negKwStr}\nCRM 대응 및 FAQ 업데이트 필요. 불만 키워드 기반 개선 메시지 준비 권장.`;
        } else if (p.posCount > 0 && p.negCount === 0) {
          const posKwStr = topPos.length > 0 ? `긍정 키워드: ${topPos.join(", ")}` : "";
          actionSummary = `[${catLabel}] ${nameLabel} — 긍정 리뷰 ${p.posCount}건 확보. ${posKwStr}\nPDP 히어로 카피, SNS 콘텐츠, Amazon A+ 활용 가능. 고객 추천 메시지로 전환 권장.`;
        } else if (p.posCount > p.negCount) {
          const posKwStr = topPos.length > 0 ? `긍정: ${topPos.join(", ")}` : "";
          const negKwStr = topNeg.length > 0 ? ` / 부정: ${topNeg.join(", ")}` : "";
          actionSummary = `[${catLabel}] ${nameLabel} — 긍정 우세(${p.posCount}건 vs 부정 ${p.negCount}건). ${posKwStr}${negKwStr}\n강점 키워드 활용 마케팅 카피 제작 및 부정 리뷰 대응 FAQ 병행 권장.`;
        } else {
          actionSummary = `[${catLabel}] ${nameLabel} — 리뷰 ${p.count}건 수집. 감성 분석 기반 콘텐츠 기획 및 타겟 마케팅 메시지 개발 필요.`;
        }

        return {
          ...p,
          avgScore,
          actionSummary,
          sources: Array.from(p.sources),
        };
      });

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
      const { data: lgReviews } = await supabase
        .from("reviews")
        .select("sentiment, sentiment_score")
        .like("source", "lge_com%")
        .limit(1000);

      const lgTotal = lgReviews?.length || 0;
      const lgPos = lgReviews?.filter((r) => r.sentiment === "positive").length || 0;
      const lgNeg = lgReviews?.filter((r) => r.sentiment === "negative").length || 0;
      const lgNeutral = lgTotal - lgPos - lgNeg;

      const { data: lgKeywords } = await supabase
        .from("trending_keywords")
        .select("keyword, count, sentiment")
        .eq("source", "lge_com")
        .eq("sentiment", "positive")
        .order("count", { ascending: false })
        .limit(3);

      const { data: redditReviews } = await supabase
        .from("reviews")
        .select("review_type, sentiment")
        .eq("source", "reddit")
        .limit(1000);

      const redditTotal = redditReviews?.length || 0;
      const redditReviewCount = redditReviews?.filter((r) => r.review_type === "REVIEW").length || 0;
      const redditVocCount = redditReviews?.filter((r) => r.review_type === "VOC").length || 0;
      const redditQuestionCount = redditReviews?.filter((r) => r.review_type === "QUESTION").length || 0;

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
      const { data: posReviews } = await supabase
        .from("reviews")
        .select("content, author, source, sentiment, rating, published_at, products!inner(model_number, display_name)")
        .eq("sentiment", "positive")
        .gte("sentiment_score", 0.8)
        .neq("source", "lge_com")
        .order("published_at", { ascending: false })
        .limit(2);

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

function useWeeklyCategoryHighlights() {
  return useQuery({
    queryKey: ["overview-weekly-category-highlights"],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data } = await supabase
        .from("reviews")
        .select("sentiment, content, products!inner(category, display_name)")
        .gte("collected_at", weekAgo.toISOString())
        .limit(1000);

      if (!data || data.length === 0) return [];

      const catMap: Record<string, { pos: number; neg: number; total: number; topSnippet: string; topProduct: string }> = {};
      const TV_KW = ["tv", "oled", "qned", "nanocell", "stanby", "objet"];

      for (const r of data as any[]) {
        let cat = (r.products?.category || "Other").toLowerCase();
        if (TV_KW.some(kw => cat.includes(kw))) cat = "TV";
        else if (cat.includes("refriger") || cat.includes("fridge")) cat = "Refrigerator";
        else if (cat.includes("wash") || cat.includes("laundry")) cat = "Washer/Dryer";
        else if (cat.includes("monitor") || cat.includes("ultragear")) cat = "Monitor";
        else if (cat.includes("sound") || cat.includes("audio")) cat = "Audio";
        else if (cat.includes("laptop") || cat.includes("gram")) cat = "Laptop";
        else cat = cat.charAt(0).toUpperCase() + cat.slice(1);

        if (!catMap[cat]) catMap[cat] = { pos: 0, neg: 0, total: 0, topSnippet: "", topProduct: "" };
        catMap[cat].total++;
        if (r.sentiment === "positive") {
          catMap[cat].pos++;
          if (!catMap[cat].topSnippet && r.content) catMap[cat].topSnippet = r.content.slice(0, 60);
        }
        if (r.sentiment === "negative") catMap[cat].neg++;
        if (!catMap[cat].topProduct) catMap[cat].topProduct = r.products?.display_name || "";
      }

      const EMOJI: Record<string, string> = {
        TV: "📺", Refrigerator: "🧊", "Washer/Dryer": "🧺", Monitor: "🖥️", Audio: "🔊", Laptop: "💻",
      };

      return Object.entries(catMap)
        .filter(([, v]) => v.total >= 3)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 6)
        .map(([cat, v]) => ({
          category: cat,
          emoji: EMOJI[cat] || "📦",
          total: v.total,
          pos: v.pos,
          neg: v.neg,
          posPct: v.total > 0 ? Math.round((v.pos / v.total) * 100) : 0,
          topSnippet: v.topSnippet,
          topProduct: v.topProduct,
        }));
    },
    staleTime: 60_000,
  });
}

/* ───── Component ───── */

export function OverviewDashboard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { data: kpis } = useOverviewKPIs();
  const { data: topActions } = useTopActions();
  const { data: channelPerf } = useChannelPerformance();
  const { data: vocSpotlight } = useVocSpotlight();
  const { data: categoryHighlights } = useWeeklyCategoryHighlights();

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 bg-primary rounded-full" />
        <h2 className="text-sm font-bold tracking-widest uppercase text-foreground">Overview</h2>
        <Badge variant="outline" className="text-[10px] ml-1 border-primary/30 text-primary font-semibold">WEEKLY</Badge>
      </div>

      {/* ─── KPI Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="TOTAL REVIEWS"
          weekly={kpis?.total.weekly}
          cumulative={kpis?.total.cumulative}
          wow={kpis?.total.wow}
        />
        <KPICard
          label="LG.COM REVIEWS"
          weekly={kpis?.lgcom.weekly}
          cumulative={kpis?.lgcom.cumulative}
          wow={kpis?.lgcom.wow}
        />
        <KPICard
          label="REDDIT REVIEWS & VOC"
          weekly={kpis?.reddit.weekly}
          cumulative={kpis?.reddit.cumulative}
          wow={kpis?.reddit.wow}
        />
        <KPICard
          label="COMMUNITY REVIEWS"
          weekly={kpis?.community.weekly}
          cumulative={kpis?.community.cumulative}
          wow={kpis?.community.wow}
          sub="닷컴·레딧 제외 타채널"
        />
      </div>

      {/* ─── TOP 3 ACTIONS THIS WEEK ─── */}
      <div>
        <SectionTitle title="TOP 3 ACTIONS THIS WEEK" />
        <div className="space-y-3">
          {topActions && topActions.length > 0 ? topActions.map((product, i) => (
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
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-foreground">
                      {product.display || product.model}
                    </h4>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                      {product.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    주간 {product.count}건 · 긍정 {product.posCount}건 · 부정 {product.negCount}건 · {product.sources.map(s => s === "lge_com" || s.startsWith("lge_com") ? "LG.com" : s).join(", ")}
                  </p>
                  <div className="text-xs text-foreground/80 mt-2 leading-relaxed whitespace-pre-line">
                    {product.actionSummary.split('\n').map((line, li) => (
                      <p key={li}>{li === 0 ? `💡 ${line}` : line}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {product.posCount > product.negCount ? (
                      <Badge variant="outline" className="text-[9px] border-success/30 text-success">
                        <TrendingUp className="h-3 w-3 mr-0.5" /> Positive trend
                      </Badge>
                    ) : product.negCount > product.posCount ? (
                      <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive">
                        <TrendingDown className="h-3 w-3 mr-0.5" /> Needs attention
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] border-muted-foreground/30 text-muted-foreground">
                        Balanced
                      </Badge>
                    )}
                    </div>
                </div>

                {/* Priority */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-[10px] text-muted-foreground">Priority {i}</p>
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">TOP POSITIVE</p>
              <div className="space-y-1.5">
                {channelPerf?.lgcom.topKeywords.map((kw) => (
                  <div key={kw.keyword} className="flex items-center gap-2">
                    <span className="text-xs text-foreground w-28 truncate">{kw.keyword}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${Math.min(100, (kw.count / (channelPerf?.lgcom.topKeywords[0]?.count || 1)) * 100)}%` }} />
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">PAIN POINT TAGS</p>
              <div className="space-y-1.5">
                {channelPerf?.reddit.painPoints.map((pp, i) => (
                  <div key={pp.keyword} className="flex items-center gap-2">
                    <span className="text-xs text-foreground w-28 truncate">{pp.keyword}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-destructive" : i === 1 ? "bg-destructive/70" : "bg-warning"}`} style={{ width: `${Math.min(100, (pp.count / (channelPerf?.reddit.painPoints[0]?.count || 1)) * 100)}%` }} />
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

      {/* ─── WEEKLY CATEGORY HIGHLIGHTS ─── */}
      {categoryHighlights && categoryHighlights.length > 0 && (
        <div>
          <SectionTitle title="WEEKLY CATEGORY HIGHLIGHTS — 제품군별 주간 핵심" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categoryHighlights.map((cat) => (
              <Card key={cat.category} className="border border-border bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="font-bold text-sm text-foreground">{cat.category}</span>
                    <Badge variant="secondary" className="text-[9px] ml-auto">{cat.total}건</Badge>
                  </div>
                  {/* Sentiment bar */}
                  <div className="flex h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-success" style={{ width: `${cat.posPct}%` }} />
                    <div className="bg-destructive" style={{ width: `${100 - cat.posPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-2">
                    <span className="text-success font-semibold">긍정 {cat.pos}</span>
                    <span className="text-destructive font-semibold">부정 {cat.neg}</span>
                  </div>
                  {cat.topProduct && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      🏷️ {cat.topProduct}
                    </p>
                  )}
                  {cat.topSnippet && (
                    <p className="text-[10px] text-muted-foreground/70 italic truncate mt-0.5">
                      "{cat.topSnippet}…"
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── MARKETING QUICK ACTIONS ─── */}
      <div>
        <SectionTitle title="MARKETING QUICK ACTIONS — 마케팅 활용 바로가기" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Store, label: "LG.com 인사이트", desc: "주간 리포트 · 리뷰 유형 분석", path: "/lgcom", color: "text-primary" },
            { icon: MessageSquare, label: "Reddit Intelligence", desc: "커뮤니티 VOC · 제품군 분석", path: "/reddit", color: "text-orange-400" },
            { icon: Wrench, label: "Marketing Toolkit", desc: "캠페인 카피 · 배너 소재 생성", path: "/toolkit", color: "text-accent-foreground" },
            { icon: HelpCircle, label: "AI FAQ 생성", desc: "리뷰 기반 FAQ 자동 생성", path: "/faq-gen", color: "text-muted-foreground" },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="group border border-border rounded-xl bg-card p-4 text-left hover:border-primary/50 hover:shadow-md transition-all"
            >
              <item.icon className={`h-5 w-5 ${item.color} mb-2`} />
              <p className="text-xs font-bold text-foreground mb-0.5">{item.label}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
              <div className="flex items-center gap-1 mt-2 text-[9px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-3 w-3" /> 바로가기
              </div>
            </button>
          ))}
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

function KPICard({ label, weekly, cumulative, wow, sub }: {
  label: string;
  weekly?: number;
  cumulative?: number;
  wow?: number;
  sub?: string;
}) {
  const wowPositive = (wow ?? 0) > 0;
  const wowNegative = (wow ?? 0) < 0;

  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-4 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">{label}</p>
        <p className="text-3xl font-bold text-foreground">
          {weekly != null ? weekly.toLocaleString() : "—"}
        </p>
        {/* WoW change */}
        <div className="flex items-center justify-center gap-1 mt-1">
          {wowPositive ? (
            <ArrowUpRight className="h-3 w-3 text-success" />
          ) : wowNegative ? (
            <ArrowDownRight className="h-3 w-3 text-destructive" />
          ) : null}
          <span className={`text-[10px] font-semibold ${
            wowPositive ? "text-success" : wowNegative ? "text-destructive" : "text-muted-foreground"
          }`}>
            {wow != null ? `${wow > 0 ? "+" : ""}${wow}% WoW` : "—"}
          </span>
        </div>
        {/* Cumulative */}
        <p className="text-[10px] text-muted-foreground mt-1">
          누적 {cumulative != null ? cumulative.toLocaleString() : "—"}건
        </p>
        {sub && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function VocCard({ voc, variant }: {
  voc: { content: string; author: string; source: string; product: string; rating?: number | null; date?: string; type: string };
  variant: "positive" | "negative";
}) {
  const isPositive = variant === "positive";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `"${voc.content}"\n— ${voc.source === "lge_com" ? "LG.com" : voc.source} · ${voc.product}${voc.rating ? ` · ${voc.rating}★` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge className={`text-[9px] mb-2 ${
            isPositive ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
          }`}>
            {voc.type}
          </Badge>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-muted/60 transition-colors shrink-0"
            title="Copy to clipboard"
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-success" />
              : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </button>
        </div>
        <p className="text-sm font-medium text-foreground italic leading-relaxed mb-3">"{voc.content}"</p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{voc.source === "lge_com" ? "LG.com" : voc.source} · {voc.product}{voc.rating ? ` · ${voc.rating}★` : ""}</span>
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
