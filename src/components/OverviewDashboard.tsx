import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourceCounts } from "@/hooks/useProductData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowRight, ArrowUpRight, ArrowDownRight, Copy, Check, Store, MessageSquare, Wrench, HelpCircle, ThumbsUp, ThumbsDown } from "lucide-react";
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

      const [totalRes, thisWeekRes, lastWeekRes, lgcomTotalRes, lgcomWeeklyRes, lgcomLastWeekRes, redditTotalRes, redditWeeklyRes, redditLastWeekRes] = await Promise.all([
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).like("source", "lge_com%"),
        supabase.from("reviews").select("*", { count: "exact", head: true }).like("source", "lge_com%").gte("collected_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).like("source", "lge_com%").gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).eq("source", "reddit"),
        supabase.from("reviews").select("*", { count: "exact", head: true }).eq("source", "reddit").gte("collected_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).eq("source", "reddit").gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString()),
      ]);

      const totalReviews = totalRes.count || 0;
      const thisWeekReviews = thisWeekRes.count || 0;
      const lastWeekReviews = lastWeekRes.count || 0;
      const lgcomTotal = lgcomTotalRes.count || 0;
      const lgcomWeekly = lgcomWeeklyRes.count || 0;
      const lgcomLastWeek = lgcomLastWeekRes.count || 0;
      const redditTotal = redditTotalRes.count || 0;
      const redditWeekly = redditWeeklyRes.count || 0;
      const redditLastWeek = redditLastWeekRes.count || 0;

      const allSources = sourceCounts || {};
      let communityTotal = 0;
      for (const [src, cnt] of Object.entries(allSources)) {
        if (src !== "lge_com" && src !== "reddit") communityTotal += cnt;
      }
      const communityWeekly = Math.max(0, thisWeekReviews - lgcomWeekly - redditWeekly);
      const communityLastWeek = Math.max(0, lastWeekReviews - lgcomLastWeek - redditLastWeek);

      const calcWow = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        total: { cumulative: totalReviews, weekly: thisWeekReviews, wow: calcWow(thisWeekReviews, lastWeekReviews) },
        lgcom: { cumulative: lgcomTotal, weekly: lgcomWeekly, wow: calcWow(lgcomWeekly, lgcomLastWeek) },
        reddit: { cumulative: redditTotal, weekly: redditWeekly, wow: calcWow(redditWeekly, redditLastWeek) },
        community: { cumulative: communityTotal, weekly: communityWeekly, wow: calcWow(communityWeekly, communityLastWeek) },
      };
    },
    staleTime: 60_000,
  });
}

interface ProductMention {
  productId: string;
  displayName: string;
  modelNumber: string;
  category: string;
  posCount: number;
  negCount: number;
  totalCount: number;
  avgScore: number;
  topPosKeywords: string[];
  topNegKeywords: string[];
  posExcerpts: string[];
  negExcerpts: string[];
}

function useTopProductMentions(sourceFilter: "lgcom" | "reddit") {
  return useQuery({
    queryKey: ["overview-top-product-mentions", sourceFilter],
    queryFn: async () => {
      const sourceCondition = sourceFilter === "lgcom" ? "lge_com%" : "reddit";

      let query = supabase
        .from("reviews")
        .select("product_id, sentiment, sentiment_score, title, content, source, rating, products!inner(model_number, display_name, category)")
        .order("collected_at", { ascending: false })
        .limit(1000);

      if (sourceFilter === "lgcom") {
        query = query.like("source", sourceCondition);
      } else {
        query = query.eq("source", sourceCondition);
      }

      const { data } = await query;
      if (!data || data.length === 0) return [];

      const productMap: Record<string, {
        productId: string;
        displayName: string;
        modelNumber: string;
        category: string;
        posCount: number;
        negCount: number;
        totalCount: number;
        scores: number[];
        posKeywords: Record<string, number>;
        negKeywords: Record<string, number>;
        posExcerpts: string[];
        negExcerpts: string[];
      }> = {};

      const extractKeywords = (text: string): string[] => {
        const stops = new Set(["the","a","an","is","was","are","were","it","its","i","my","and","or","but","to","of","in","for","on","with","this","that","very","so","not","no","has","have","had","been","be","do","does","did","will","would","can","could","just","also","from","at","by","as","all","they","them","we","our","you","your","he","she","her","his","really","great","good","love","like","get","got","one","use","used","using","new","much","well","best","better","than","more","most","make","made","way","even","still","back","about","into","over","only","after","don","doesn","didn","won","isn","aren","wasn","weren","couldn","shouldn","wouldn","lot","thing","things","look","looking","looks","going","come","want","need","work","works","working","take","going","know","think","said","say","says","every","day","time","first","two","long","little","big","old","high","right","left","sure","keep","let","same","many","own","off","put","end","point","part","being","through","during","each","some","found","being","these","those","here","there","where","when","while","other","another","again","far","before","between","both","under","around"]);
        return text.toLowerCase()
          .replace(/[^a-z가-힣\s]/g, " ")
          .split(/\s+/)
          .filter(w => w.length > 2 && !stops.has(w));
      };

      const extractExcerpt = (content: string): string => {
        if (!content) return "";
        // Remove masked content prefix
        const cleaned = content.replace(/^\[LG 리뷰.*?\]\s*/, "").replace(/개인정보 보호 정책에 따라.*$/, "").trim();
        if (cleaned.length < 10) return content.slice(0, 100);
        // Get meaningful middle portion
        if (cleaned.length <= 120) return cleaned;
        return cleaned.slice(0, 120) + "…";
      };

      for (const r of data as any[]) {
        const pid = r.product_id;
        if (!productMap[pid]) {
          productMap[pid] = {
            productId: pid,
            displayName: r.products.display_name,
            modelNumber: r.products.model_number,
            category: r.products.category,
            posCount: 0, negCount: 0, totalCount: 0,
            scores: [],
            posKeywords: {}, negKeywords: {},
            posExcerpts: [], negExcerpts: [],
          };
        }
        const p = productMap[pid];
        p.totalCount++;

        const contentText = r.title || r.content || "";

        if (r.sentiment === "positive") {
          p.posCount++;
          for (const kw of extractKeywords(contentText)) {
            p.posKeywords[kw] = (p.posKeywords[kw] || 0) + 1;
          }
          if (p.posExcerpts.length < 3) {
            const excerpt = extractExcerpt(r.content || "");
            if (excerpt.length > 15) p.posExcerpts.push(excerpt);
          }
        } else if (r.sentiment === "negative") {
          p.negCount++;
          for (const kw of extractKeywords(contentText)) {
            p.negKeywords[kw] = (p.negKeywords[kw] || 0) + 1;
          }
          if (p.negExcerpts.length < 3) {
            const excerpt = extractExcerpt(r.content || "");
            if (excerpt.length > 15) p.negExcerpts.push(excerpt);
          }
        }
        if (r.sentiment_score != null) p.scores.push(r.sentiment_score);
      }

      const results: ProductMention[] = Object.values(productMap)
        .map((p) => ({
          productId: p.productId,
          displayName: p.displayName,
          modelNumber: p.modelNumber,
          category: p.category,
          posCount: p.posCount,
          negCount: p.negCount,
          totalCount: p.totalCount,
          avgScore: p.scores.length > 0
            ? Math.round((p.scores.reduce((a, b) => a + b, 0) / p.scores.length) * 100)
            : 50,
          topPosKeywords: Object.entries(p.posKeywords).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
          topNegKeywords: Object.entries(p.negKeywords).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
          posExcerpts: p.posExcerpts,
          negExcerpts: p.negExcerpts,
        }))
        .sort((a, b) => b.totalCount - a.totalCount)
        .slice(0, 10);

      return results;
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
        .select("sentiment, content, source, products!inner(category, display_name)")
        .gte("collected_at", weekAgo.toISOString())
        .not("source", "like", "lge_com%")
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
  const { data: lgcomMentions } = useTopProductMentions("lgcom");
  const { data: redditMentions } = useTopProductMentions("reddit");
  const { data: categoryHighlights } = useWeeklyCategoryHighlights();

  return (
    <div className="space-y-6">
      {/* ─── KPI Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="TOTAL REVIEWS" weekly={kpis?.total.weekly} cumulative={kpis?.total.cumulative} wow={kpis?.total.wow} />
        <KPICard label="LG.COM REVIEWS" weekly={kpis?.lgcom.weekly} cumulative={kpis?.lgcom.cumulative} wow={kpis?.lgcom.wow} />
        <KPICard label="REDDIT SIGNALS" weekly={kpis?.reddit.weekly} cumulative={kpis?.reddit.cumulative} wow={kpis?.reddit.wow} />
        <KPICard label="COMMUNITY" weekly={kpis?.community.weekly} cumulative={kpis?.community.cumulative} wow={kpis?.community.wow} sub="닷컴·레딧 제외 타채널" />
      </div>

      {/* ─── LG.COM TOP 10 PRODUCT MENTIONS ─── */}
      <div>
        <SectionTitle title="LG.COM 리뷰 분석 — TOP 10 제품별 코멘트" />
        <ProductMentionList mentions={lgcomMentions || []} sourceLabel="LG.com" accentColor="primary" />
      </div>

      {/* ─── REDDIT TOP 10 PRODUCT MENTIONS ─── */}
      <div>
        <SectionTitle title="REDDIT 시그널 분석 — TOP 10 제품별 코멘트" />
        <ProductMentionList mentions={redditMentions || []} sourceLabel="Reddit" accentColor="orange-400" />
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
                  <div className="flex h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-success" style={{ width: `${cat.posPct}%` }} />
                    <div className="bg-destructive" style={{ width: `${100 - cat.posPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-2">
                    <span className="text-success font-semibold">긍정 {cat.pos}</span>
                    <span className="text-destructive font-semibold">부정 {cat.neg}</span>
                  </div>
                  {cat.topProduct && <p className="text-[10px] text-muted-foreground truncate">🏷️ {cat.topProduct}</p>}
                  {cat.topSnippet && <p className="text-[10px] text-muted-foreground/70 italic truncate mt-0.5">"{cat.topSnippet}…"</p>}
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
            { icon: Store, label: "LG.com 인사이트", desc: "주간 리포트 · 리뷰 분석", path: "/lgcom", color: "text-primary" },
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
  label: string; weekly?: number; cumulative?: number; wow?: number; sub?: string;
}) {
  const wowPositive = (wow ?? 0) > 0;
  const wowNegative = (wow ?? 0) < 0;

  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-4 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">{label}</p>
        <p className="text-3xl font-bold text-foreground">{weekly != null ? weekly.toLocaleString() : "—"}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {wowPositive ? <ArrowUpRight className="h-3 w-3 text-success" /> : wowNegative ? <ArrowDownRight className="h-3 w-3 text-destructive" /> : null}
          <span className={`text-[10px] font-semibold ${wowPositive ? "text-success" : wowNegative ? "text-destructive" : "text-muted-foreground"}`}>
            {wow != null ? `${wow > 0 ? "+" : ""}${wow}% WoW` : "—"}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">누적 {cumulative != null ? cumulative.toLocaleString() : "—"}건</p>
        {sub && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ProductMentionList({ mentions, sourceLabel, accentColor }: {
  mentions: ProductMention[];
  sourceLabel: string;
  accentColor: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (mentions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{sourceLabel} 데이터를 불러오는 중...</p>;
  }

  return (
    <div className="space-y-2">
      {mentions.map((m, i) => {
        const isExpanded = expandedId === m.productId;
        return (
          <Card
            key={m.productId}
            className="border border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setExpandedId(isExpanded ? null : m.productId)}
          >
            <CardContent className="p-4">
              {/* Header row */}
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground ${
                  i < 3 ? "bg-primary" : "bg-muted-foreground/60"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{m.displayName}</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{m.category}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>총 {m.totalCount}건</span>
                    <span className="flex items-center gap-0.5 text-success font-semibold">
                      <ThumbsUp className="h-3 w-3" /> {m.posCount}
                    </span>
                    <span className="flex items-center gap-0.5 text-destructive font-semibold">
                      <ThumbsDown className="h-3 w-3" /> {m.negCount}
                    </span>
                    <span className="text-muted-foreground">감성 {m.avgScore}점</span>
                  </div>
                </div>
                <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </div>

              {/* Keywords row - always visible */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {m.topPosKeywords.slice(0, 3).map((kw) => (
                  <Badge key={kw} className="text-[9px] bg-success/10 text-success border-success/20 hover:bg-success/20">
                    +{kw}
                  </Badge>
                ))}
                {m.topNegKeywords.slice(0, 3).map((kw) => (
                  <Badge key={kw} className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                    −{kw}
                  </Badge>
                ))}
              </div>

              {/* Expanded: excerpts */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                  {m.posExcerpts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-success mb-1.5 flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> 긍정 코멘트 원문
                      </p>
                      <div className="space-y-1.5">
                        {m.posExcerpts.map((ex, ei) => (
                          <ExcerptRow key={ei} text={ex} variant="positive" />
                        ))}
                      </div>
                    </div>
                  )}
                  {m.negExcerpts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-destructive mb-1.5 flex items-center gap-1">
                        <ThumbsDown className="h-3 w-3" /> 부정 코멘트 원문
                      </p>
                      <div className="space-y-1.5">
                        {m.negExcerpts.map((ex, ei) => (
                          <ExcerptRow key={ei} text={ex} variant="negative" />
                        ))}
                      </div>
                    </div>
                  )}
                  {m.topPosKeywords.length > 3 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] text-muted-foreground mr-1">추가 키워드:</span>
                      {m.topPosKeywords.slice(3).map((kw) => (
                        <Badge key={kw} variant="outline" className="text-[8px]">{kw}</Badge>
                      ))}
                      {m.topNegKeywords.slice(3).map((kw) => (
                        <Badge key={kw} variant="outline" className="text-[8px] border-destructive/30 text-destructive">{kw}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ExcerptRow({ text, variant }: { text: string; variant: "positive" | "negative" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex items-start gap-2 p-2 rounded-md text-xs leading-relaxed ${
      variant === "positive" ? "bg-success/5 border border-success/10" : "bg-destructive/5 border border-destructive/10"
    }`}>
      <p className="flex-1 text-foreground/80 italic">"{text}"</p>
      <button onClick={handleCopy} className="flex-shrink-0 p-1 rounded hover:bg-muted/60 transition-colors" title="Copy">
        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
      </button>
    </div>
  );
}
