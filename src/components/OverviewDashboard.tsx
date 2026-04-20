import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourceCounts } from "@/hooks/useProductData";
import { maskCompetitorNames } from "@/lib/sentiment";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy, Check,
  ThumbsUp, Lightbulb,
  Loader2, Sparkles, AlertTriangle, Star, ChevronDown, ChevronUp, TrendingUp
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { DataWindowBadge } from "@/components/DataWindowBadge";

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
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("published_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("published_at", twoWeeksAgo.toISOString()).lt("published_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).like("source", "lge_com%"),
        supabase.from("reviews").select("*", { count: "exact", head: true }).like("source", "lge_com%").gte("published_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).like("source", "lge_com%").gte("published_at", twoWeeksAgo.toISOString()).lt("published_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).like("source", "reddit%"),
        supabase.from("reviews").select("*", { count: "exact", head: true }).like("source", "reddit%").gte("published_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).like("source", "reddit%").gte("published_at", twoWeeksAgo.toISOString()).lt("published_at", weekAgo.toISOString()),
      ]);
      const calc = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);
      const allSources = sourceCounts || {};
      let communityTotal = 0;
      for (const [src, cnt] of Object.entries(allSources)) {
        if (src === "lge_com" || src === "reddit") continue;
        if (src.startsWith("lge_com") || src.startsWith("reddit")) continue;
        communityTotal += cnt;
      }
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
interface RecurringPraise {
  text: string;
  product?: string;
  category?: string;
}
interface KeyTakeawayItem {
  product: string;
  category: string;
  positive_msg: string;
  negative_msg: string;
  marketer_action: string;
}
interface OverviewData {
  top_topics: TopTopic[];
  urgent_issues: UrgentIssue[];
  recurring_praise: (string | RecurringPraise)[];
  unmatched_praise: string[];
  key_takeaway?: KeyTakeawayItem[];
}

/* ───── Component ───── */
export function OverviewDashboard({ country: _country }: { country?: string }) {
  useLang();
  
  // KPI hook kept for potential future use
  const { data: _kpis } = useOverviewKPIs();

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
      {/* KPIs removed */}

      {/* LG.com Weekly Overview */}
      <ChannelOverviewSection
        channelLabel="LG.COM"
        channelEmoji="🏪"
        overview={lgcomOverview}
        isLoading={lgcomLoading}
        onGenerate={() => generateOverview("lgcom")}
      />

      {/* Reddit Weekly Overview */}
      <ChannelOverviewSection
        channelLabel="REDDIT"
        channelEmoji="💬"
        overview={redditOverview}
        isLoading={redditLoading}
        onGenerate={() => generateOverview("reddit")}
      />

    </div>
  );
}

const COUNTRY_FLAG: Record<string, string> = {
  US: "🇺🇸", UK: "🇬🇧", DE: "🇩🇪", AU: "🇦🇺", IN: "🇮🇳",
  TW: "🇹🇼", JP: "🇯🇵", TH: "🇹🇭", BR: "🇧🇷",
  SG: "🇸🇬", MY: "🇲🇾", ID: "🇮🇩", PH: "🇵🇭", VN: "🇻🇳",
  HK: "🇭🇰", FR: "🇫🇷", CA: "🇨🇦", MX: "🇲🇽",
  Global: "🌐", Other: "🌐",
};
// ISO 2자리 → LGE 법인 코드 (RIS Subsidiary List 표준)
const COUNTRY_LGE: Record<string, string> = {
  US: "LGEUS", UK: "LGEUK", DE: "LGEDE", AU: "LGEAP", IN: "LGEIL",
  TW: "LGETT", JP: "LGEJP", TH: "LGETH", BR: "LGESP",
  SG: "LGESL", MY: "LGEML", ID: "LGEIN", PH: "LGEPH", VN: "LGEVN",
  HK: "LGEHK", FR: "LGEFS", CA: "LGECI", MX: "LGEMS",
  Global: "Global", Other: "Other",
};

function useChannelCountryDistribution(channel: "lgcom" | "reddit" | null) {
  return useQuery({
    queryKey: ["channel-country-dist-v1", channel],
    enabled: !!channel,
    staleTime: 60_000,
    queryFn: async () => {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const sourceLike = channel === "lgcom" ? "lge_com%" : "reddit%";

      const [weeklyRes, totalRes] = await Promise.all([
        supabase.from("reviews").select("source").like("source", sourceLike).gte("collected_at", weekAgo.toISOString()).limit(10000),
        supabase.from("reviews").select("source").like("source", sourceLike).limit(20000),
      ]);

      const mapToCountry = (src: string): string => {
        if (channel === "lgcom") {
          const m = src.match(/^lge_com_([a-z]{2})$/);
          return m ? m[1].toUpperCase() : "Global";
        }
        // reddit channels — most are US-based community
        return "Global";
      };

      const tally = (rows: { source: string }[] | null) => {
        const out: Record<string, number> = {};
        for (const r of rows || []) {
          const c = mapToCountry(r.source);
          out[c] = (out[c] || 0) + 1;
        }
        return out;
      };

      return { weekly: tally(weeklyRes.data), total: tally(totalRes.data) };
    },
  });
}

/* ───── Channel Overview Section ───── */
function ChannelOverviewSection({ channelLabel, channelEmoji, overview, isLoading, onGenerate }: {
  channelLabel: string; channelEmoji: string;
  overview: OverviewData | null; isLoading: boolean;
  onGenerate: () => void;
}) {
  const [topicsOpen, setTopicsOpen] = useState(true);
  const [issuesOpen, setIssuesOpen] = useState(true);
  const [praiseOpen, setPraiseOpen] = useState(true);
  const [unmatchedOpen, setUnmatchedOpen] = useState(true);
  const [takeawayOpen, setTakeawayOpen] = useState(true);

  // Map channel label → source LIKE pattern for window badge
  const sourceLike = channelLabel === "LG.COM" ? "lge_com%" : channelLabel === "REDDIT" ? "reddit%" : undefined;
  const channelKey: "lgcom" | "reddit" | null =
    channelLabel === "LG.COM" ? "lgcom" : channelLabel === "REDDIT" ? "reddit" : null;
  const { data: countryDist } = useChannelCountryDistribution(channelKey);

  const sortedCountries = countryDist
    ? Object.entries(countryDist.total).sort((a, b) => b[1] - a[1])
    : [];


  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <SectionTitle title={`${channelEmoji} ${channelLabel} 주간 오버뷰`} />
          <DataWindowBadge sourceLike={sourceLike} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {sortedCountries.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mr-1">국가별</span>
              {sortedCountries.slice(0, 8).map(([code, total]) => {
                const weekly = countryDist?.weekly?.[code] || 0;
                return (
                  <Badge
                    key={code}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-border bg-muted/40 text-foreground gap-1"
                    title={`${COUNTRY_LGE[code] || code}: 누적 ${total.toLocaleString()} · 7일 ${weekly.toLocaleString()}`}
                  >
                    <span>{COUNTRY_FLAG[code] || "🌐"}</span>
                    <span className="font-semibold">{COUNTRY_LGE[code] || code}</span>
                    <span className="text-muted-foreground">{total.toLocaleString()}</span>
                    {weekly > 0 && (
                      <span className="text-success font-semibold">+{weekly}</span>
                    )}
                  </Badge>
                );
              })}
            </div>
          )}
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
          {/* KEY TAKEAWAY — 맨 위 */}
          {overview.key_takeaway && overview.key_takeaway.length > 0 && (
            <CollapsibleSection
              icon={<Lightbulb className="h-4 w-4 text-amber-500" />}
              title="KEY TAKEAWAY — 마케터 인사이트"
              open={takeawayOpen}
              onToggle={() => setTakeawayOpen(!takeawayOpen)}
              bgClass="bg-amber-50/50 border-amber-500/20 dark:bg-amber-500/5"
            >
              <div className="space-y-3">
                {overview.key_takeaway.map((item, i) => (
                  <div key={i} className="border border-amber-500/15 bg-amber-50/30 dark:bg-amber-500/5 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.category && item.category !== "General" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold">
                          {item.category}
                        </Badge>
                      )}
                      <span className="text-sm font-bold text-foreground">{item.product}</span>
                      <CopyBtn text={`[${item.product}]\n👍 ${item.positive_msg}\n👎 ${item.negative_msg}\n🎯 ${item.marketer_action}`} />
                    </div>
                    <div className="text-xs space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="text-success shrink-0">👍</span>
                        <p className="text-foreground leading-relaxed">{maskCompetitorNames(item.positive_msg)}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-destructive shrink-0">👎</span>
                        <p className="text-foreground leading-relaxed">{maskCompetitorNames(item.negative_msg)}</p>
                      </div>
                      <div className="flex items-start gap-2 bg-amber-100/50 dark:bg-amber-500/10 rounded-md px-3 py-2">
                        <span className="shrink-0">🎯</span>
                        <p className="text-foreground font-medium leading-relaxed">{maskCompetitorNames(item.marketer_action)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

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
                      {topic.rank}. {maskCompetitorNames(topic.topic)}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">언급 {topic.mention_pct}%</span>
                      <span className="text-success font-semibold">🔥 {topic.positive_pct}%</span>
                      <span className="text-destructive font-semibold">👎 {topic.negative_pct}%</span>
                    </div>
                    <CopyBtn text={`${topic.topic}\n언급 ${topic.mention_pct}% | 긍정 ${topic.positive_pct}% | 부정 ${topic.negative_pct}%\n"${topic.representative_comment}"\n관련: ${topic.related_products?.join(", ")}`} />
                  </div>
                  <p className="text-xs text-foreground/80 italic leading-relaxed bg-muted/30 rounded-md px-3 py-2">
                    "{maskCompetitorNames(topic.representative_comment)}"
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
                      <h4 className="text-sm font-bold text-destructive">{maskCompetitorNames(issue.issue)}</h4>
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
              {(overview.recurring_praise || []).map((praise, i) => {
                const item = typeof praise === "string" ? { text: praise } : praise;
                return (
                  <div key={i} className="flex items-start gap-2 px-3 py-2">
                    <span className="text-success mt-0.5">✅</span>
                    <div className="flex-1">
                      {item.category && item.category !== "General" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 mb-1 mr-1 border-success/30 text-success">{item.category}{item.product ? ` · ${item.product}` : ""}</Badge>
                      )}
                      <p className="text-xs text-foreground leading-relaxed">{maskCompetitorNames(item.text)}</p>
                    </div>
                    <CopyBtn text={item.text} />
                  </div>
                );
              })}
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

// KPICard removed — no longer displayed
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
