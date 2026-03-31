import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourceCounts } from "@/hooks/useProductData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, ArrowUpRight, ArrowDownRight, Copy, Check,
  Store, MessageSquare, Wrench, HelpCircle, ThumbsUp, ThumbsDown,
  Loader2, Sparkles, AlertTriangle, Star, ChevronDown, ChevronUp, TrendingUp
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ───── KPI hook ───── */
function useOverviewKPIs() {
  const { data: sourceCounts } = useSourceCounts();
  return useQuery({
    queryKey: ["overview-kpis-v2", sourceCounts],
    queryFn: async () => {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
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
      const calc = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);
      const allSources = sourceCounts || {};
      let communityTotal = 0;
      for (const [src, cnt] of Object.entries(allSources)) { if (src !== "lge_com" && src !== "reddit") communityTotal += cnt; }
      return {
        total: { cumulative: totalRes.count || 0, weekly: thisWeekRes.count || 0, wow: calc(thisWeekRes.count || 0, lastWeekRes.count || 0) },
        lgcom: { cumulative: lgcomTotalRes.count || 0, weekly: lgcomWeeklyRes.count || 0, wow: calc(lgcomWeeklyRes.count || 0, lgcomLastWeekRes.count || 0) },
        reddit: { cumulative: redditTotalRes.count || 0, weekly: redditWeeklyRes.count || 0, wow: calc(redditWeeklyRes.count || 0, redditLastWeekRes.count || 0) },
        community: { cumulative: communityTotal, weekly: Math.max(0, (thisWeekRes.count || 0) - (lgcomWeeklyRes.count || 0) - (redditWeeklyRes.count || 0)), wow: 0 },
      };
    },
    staleTime: 60_000,
  });
}

/* ───── Types ───── */
interface TopTopic {
  rank: number; topic: string; mention_pct: number;
  positive_pct: number; negative_pct: number;
  representative_comment: string; related_products: string[];
}
interface UrgentIssue {
  rank: number; issue: string; mention_pct: number;
  pattern: string; cause: string; related_products: string[];
}
interface OverviewData {
  top_topics: TopTopic[];
  urgent_issues: UrgentIssue[];
  recurring_praise: string[];
  unmatched_praise: string[];
}

/* ───── Component ───── */
export function OverviewDashboard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { data: kpis } = useOverviewKPIs();

  // AI overview states
  const [lgcomOverview, setLgcomOverview] = useState<OverviewData | null>(null);
  const [redditOverview, setRedditOverview] = useState<OverviewData | null>(null);
  const [lgcomLoading, setLgcomLoading] = useState(false);
  const [redditLoading, setRedditLoading] = useState(false);

  const generateOverview = async (channel: "lgcom" | "reddit") => {
    const setLoading = channel === "lgcom" ? setLgcomLoading : setRedditLoading;
    const setData = channel === "lgcom" ? setLgcomOverview : setRedditOverview;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-overview-summary", {
        body: { channel },
      });
      if (error) throw error;
      if (data?.overview) {
        setData(data.overview);
        toast.success(`${channel === "lgcom" ? "LG.com" : "Reddit"} 주간 오버뷰 생성 완료!`);
      }
    } catch (err: any) {
      toast.error("생성 실패: " + (err.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="TOTAL REVIEWS" weekly={kpis?.total.weekly} cumulative={kpis?.total.cumulative} wow={kpis?.total.wow} />
        <KPICard label="LG.COM REVIEWS" weekly={kpis?.lgcom.weekly} cumulative={kpis?.lgcom.cumulative} wow={kpis?.lgcom.wow} />
        <KPICard label="REDDIT SIGNALS" weekly={kpis?.reddit.weekly} cumulative={kpis?.reddit.cumulative} wow={kpis?.reddit.wow} />
        <KPICard label="COMMUNITY" weekly={kpis?.community.weekly} cumulative={kpis?.community.cumulative} wow={kpis?.community.wow} sub="닷컴·레딧 제외 타채널" />
      </div>

      {/* LG.com Weekly Overview */}
      <ChannelOverviewSection
        channelLabel="LG.COM"
        channelEmoji="🏪"
        overview={lgcomOverview}
        isLoading={lgcomLoading}
        onGenerate={() => generateOverview("lgcom")}
        accentClass="primary"
      />

      {/* Reddit Weekly Overview */}
      <ChannelOverviewSection
        channelLabel="REDDIT"
        channelEmoji="💬"
        overview={redditOverview}
        isLoading={redditLoading}
        onGenerate={() => generateOverview("reddit")}
        accentClass="orange-500"
      />

      {/* Quick Actions */}
      <div>
        <SectionTitle title="MARKETING QUICK ACTIONS" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Store, label: "LG.com 인사이트", desc: "주간 리포트 · 리뷰 분석", path: "/lgcom", color: "text-primary" },
            { icon: MessageSquare, label: "Reddit Intelligence", desc: "커뮤니티 VOC · 제품군 분석", path: "/reddit", color: "text-orange-400" },
            { icon: Wrench, label: "Marketing Toolkit", desc: "캠페인 카피 · 배너 소재 생성", path: "/toolkit", color: "text-accent-foreground" },
            { icon: HelpCircle, label: "AI FAQ 생성", desc: "리뷰 기반 FAQ 자동 생성", path: "/faq-gen", color: "text-muted-foreground" },
          ].map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="group border border-border rounded-xl bg-card p-4 text-left hover:border-primary/50 hover:shadow-md transition-all">
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

/* ───── Channel Overview Section ───── */
function ChannelOverviewSection({ channelLabel, channelEmoji, overview, isLoading, onGenerate, accentClass }: {
  channelLabel: string; channelEmoji: string;
  overview: OverviewData | null; isLoading: boolean;
  onGenerate: () => void; accentClass: string;
}) {
  const [topicsOpen, setTopicsOpen] = useState(true);
  const [issuesOpen, setIssuesOpen] = useState(true);
  const [praiseOpen, setPraiseOpen] = useState(true);
  const [unmatchedOpen, setUnmatchedOpen] = useState(true);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle title={`${channelEmoji} ${channelLabel} 주간 오버뷰`} />
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {isLoading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 분석 중...</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" /> 오버뷰 생성</>
          )}
        </button>
      </div>

      {!overview && !isLoading && (
        <Card className="border border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
            <Sparkles className="h-8 w-8 opacity-30" />
            <p className="text-sm">오버뷰 생성 버튼을 클릭하여 AI 기반 주간 분석을 시작하세요</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card className="border border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">AI가 리뷰를 분석하고 있습니다...</p>
            <p className="text-xs">30~60초 소요될 수 있습니다</p>
          </CardContent>
        </Card>
      )}

      {overview && !isLoading && (
        <div className="space-y-3">
          {/* 1. TOP 5 Topics */}
          <CollapsibleSection
            icon={<TrendingUp className="h-4 w-4" />}
            title={`고객이 가장 많이 말하는 ${overview.top_topics?.length || 5}가지 주제`}
            open={topicsOpen}
            onToggle={() => setTopicsOpen(!topicsOpen)}
            bgClass="bg-card"
          >
            <div className="space-y-3">
              {(overview.top_topics || []).map((topic, i) => (
                <div key={i} className="border border-border/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-foreground">
                      {topic.rank}. {topic.topic}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">언급 {topic.mention_pct}%</span>
                      <span className="text-success font-semibold">🔥 {topic.positive_pct}%</span>
                      <span className="text-destructive font-semibold">👎 {topic.negative_pct}%</span>
                    </div>
                    <CopyBtn text={`${topic.topic}\n언급 ${topic.mention_pct}% | 긍정 ${topic.positive_pct}% | 부정 ${topic.negative_pct}%\n"${topic.representative_comment}"\n관련: ${topic.related_products?.join(", ")}`} />
                  </div>
                  <p className="text-xs text-foreground/80 italic leading-relaxed bg-muted/30 rounded-md px-3 py-2">
                    "{topic.representative_comment}"
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(topic.related_products || []).map((p, pi) => (
                      <Badge key={pi} variant="secondary" className="text-[9px] px-1.5 py-0">{p}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* 2. Urgent Issues TOP 3 */}
          <CollapsibleSection
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            title={`개선 시급 이슈 TOP ${overview.urgent_issues?.length || 3}`}
            open={issuesOpen}
            onToggle={() => setIssuesOpen(!issuesOpen)}
            bgClass="bg-destructive/3 border-destructive/15"
          >
            <div className="space-y-3">
              {(overview.urgent_issues || []).map((issue, i) => (
                <div key={i} className="border border-destructive/10 bg-destructive/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-bold">{issue.rank}</span>
                      <h4 className="text-sm font-bold text-destructive">{issue.issue}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-destructive font-semibold">{issue.mention_pct}%</span>
                      <CopyBtn text={`[이슈 ${issue.rank}] ${issue.issue}\n비율: ${issue.mention_pct}%\n패턴: ${issue.pattern}\n원인: ${issue.cause}\n관련: ${issue.related_products?.join(", ")}`} />
                    </div>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><span className="text-muted-foreground font-medium">패턴:</span> <span className="text-foreground">{issue.pattern}</span></p>
                    <p><span className="text-destructive font-medium">원인:</span> <span className="text-foreground">{issue.cause}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(issue.related_products || []).map((p, pi) => (
                      <Badge key={pi} variant="outline" className="text-[9px] px-1.5 py-0 border-destructive/20 text-destructive">{p}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* 3. Recurring Praise */}
          <CollapsibleSection
            icon={<ThumbsUp className="h-4 w-4 text-success" />}
            title="반복 칭찬 포인트"
            open={praiseOpen}
            onToggle={() => setPraiseOpen(!praiseOpen)}
            bgClass="bg-success/3 border-success/15"
          >
            <div className="space-y-2">
              {(overview.recurring_praise || []).map((praise, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2">
                  <span className="text-success mt-0.5">✅</span>
                  <p className="text-xs text-foreground flex-1 leading-relaxed">{praise}</p>
                  <CopyBtn text={praise} />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* 4. Unmatched Praise */}
          <CollapsibleSection
            icon={<Star className="h-4 w-4 text-yellow-500" />}
            title={`"비교 없이" 칭찬하는 포인트`}
            open={unmatchedOpen}
            onToggle={() => setUnmatchedOpen(!unmatchedOpen)}
            bgClass="bg-yellow-50/50 border-yellow-500/15 dark:bg-yellow-500/5"
          >
            <div className="space-y-2">
              {(overview.unmatched_praise || []).map((praise, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2">
                  <span className="text-yellow-500 mt-0.5">⭐</span>
                  <p className="text-xs text-foreground flex-1 leading-relaxed italic">{praise}</p>
                  <CopyBtn text={praise} />
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      )}
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

function CollapsibleSection({ icon, title, open, onToggle, bgClass, children }: {
  icon: React.ReactNode; title: string; open: boolean;
  onToggle: () => void; bgClass: string; children: React.ReactNode;
}) {
  return (
    <Card className={`border ${bgClass}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-2 p-4 text-left">
        {icon}
        <h4 className="text-sm font-bold text-foreground flex-1">{title}</h4>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0 pb-4">{children}</CardContent>}
    </Card>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); toast.success("Copied!"); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted/50 transition-colors shrink-0"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}
