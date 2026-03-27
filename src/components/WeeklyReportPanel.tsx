import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, TrendingUp, TrendingDown, Minus, FileText,
  AlertTriangle, Lightbulb, Megaphone, Image, Loader2,
  ChevronDown, ChevronUp, ShieldAlert, Star, Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WeeklyReport {
  country: string;
  week_range: string;
  date_range: { start: string; end: string };
  summary: {
    total_reviews: number;
    organic_pct: number;
    paid_pct: number;
    syndication_pct: number;
    avg_rating: number;
    avg_rating_by_type: { organic: number; paid: number; syndication: number };
  };
  insights: {
    top_strengths: { keyword: string; count: number; snippet: string }[];
    top_pain_points: { keyword: string; count: number; severity: number }[];
    feature_topics: { topic: string; positive: number; negative: number }[];
    issue_clusters: { cluster_name: string; frequency: number; is_new?: boolean; description: string }[];
  };
  positive_highlights: { snippet: string; context: string }[];
  weekly_trend: string;
  content_recommendations: {
    pdp_updates: string[];
    faq_candidates: { q: string; a_outline: string }[];
    inside_channel_copy: string[];
    outside_channel_copy: string[];
    visual_guidelines: string[];
  };
  notes: string;
}

function getWeekOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const dayOfWeek = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const tempDate = new Date(monday);
    tempDate.setDate(tempDate.getDate() + 3);
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const weekStr = `${monday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    const label = `${weekStr} (${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
    options.push({ value: weekStr, label });
  }
  return options;
}

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const SeverityDots = ({ severity }: { severity: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className={`w-2 h-2 rounded-full ${i <= severity ? "bg-destructive" : "bg-muted"}`} />
    ))}
  </div>
);

export function WeeklyReportPanel() {
  const { t } = useLang();
  const [country, setCountry] = useState("US");
  const [weekRange, setWeekRange] = useState(getWeekOptions()[0]?.value || "");
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["summary", "insights"]));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-weekly-report", {
        body: { country, week_range: weekRange },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error || "Failed to generate report");
      setReport(data.report);
    } catch (e: any) {
      setError(e.message || "Report generation failed");
    } finally {
      setLoading(false);
    }
  };

  const weekOptions = getWeekOptions();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {t("Weekly Review Report", "주간 리뷰 리포트")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("Country", "국가")}</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 US</SelectItem>
                  <SelectItem value="UK">🇬🇧 UK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("Week", "주차")}</label>
              <Select value={weekRange} onValueChange={setWeekRange}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {weekOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              {t("Generate Report", "리포트 생성")}
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Report */}
      {report && (
        <div className="space-y-3 animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="text-sm border-primary/30 font-mono">
              {report.country} — {report.week_range}
            </Badge>
            <div className="flex items-center gap-1.5">
              <TrendIcon trend={report.weekly_trend} />
              <span className="text-xs text-muted-foreground capitalize">{report.weekly_trend}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {report.summary.total_reviews} {t("reviews", "건")}
            </Badge>
          </div>

          {/* Summary Section */}
          <SectionCard
            title={t("Summary", "요약")}
            id="summary"
            icon={<BarChart3 className="h-4 w-4" />}
            expanded={expandedSections.has("summary")}
            onToggle={() => toggleSection("summary")}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label={t("Total Reviews", "총 리뷰")} value={report.summary.total_reviews} />
              <StatBox label={t("Avg Rating", "평균 평점")} value={`${report.summary.avg_rating} ★`} />
              <StatBox label="Organic" value={`${report.summary.organic_pct}%`} />
              <StatBox label="Paid" value={`${report.summary.paid_pct}%`} />
            </div>
            {(report.summary.avg_rating_by_type.organic > 0 || report.summary.avg_rating_by_type.paid > 0) && (
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>Organic ★ {report.summary.avg_rating_by_type.organic}</span>
                <span>Paid ★ {report.summary.avg_rating_by_type.paid}</span>
                <span>Syndication ★ {report.summary.avg_rating_by_type.syndication}</span>
              </div>
            )}
          </SectionCard>

          {/* Insights */}
          <SectionCard
            title={t("Insights", "인사이트")}
            id="insights"
            icon={<Lightbulb className="h-4 w-4" />}
            expanded={expandedSections.has("insights")}
            onToggle={() => toggleSection("insights")}
          >
            <Tabs defaultValue="strengths" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-secondary/50">
                <TabsTrigger value="strengths" className="text-xs py-1.5">💪 {t("Strengths", "강점")}</TabsTrigger>
                <TabsTrigger value="pains" className="text-xs py-1.5">⚠️ {t("Pain Points", "페인포인트")}</TabsTrigger>
                <TabsTrigger value="features" className="text-xs py-1.5">📊 {t("Features", "기능")}</TabsTrigger>
                <TabsTrigger value="clusters" className="text-xs py-1.5">🔍 {t("Issues", "이슈")}</TabsTrigger>
              </TabsList>

              <TabsContent value="strengths" className="mt-3 space-y-2">
                {report.insights.top_strengths.length === 0 && <EmptyState />}
                {report.insights.top_strengths.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-success/5 border border-success/20">
                    <div>
                      <span className="font-medium text-sm">{s.keyword}</span>
                      {s.snippet && <span className="ml-2 text-xs text-muted-foreground italic">"{s.snippet}"</span>}
                    </div>
                    <Badge variant="secondary" className="text-xs">{s.count}x</Badge>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="pains" className="mt-3 space-y-2">
                {report.insights.top_pain_points.length === 0 && <EmptyState />}
                {report.insights.top_pain_points.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{p.keyword}</span>
                      <SeverityDots severity={p.severity} />
                    </div>
                    <Badge variant="secondary" className="text-xs">{p.count}x</Badge>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="features" className="mt-3">
                {report.insights.feature_topics.length === 0 && <EmptyState />}
                <div className="space-y-1.5">
                  {report.insights.feature_topics.map((f, i) => {
                    const total = f.positive + f.negative || 1;
                    const posPct = (f.positive / total) * 100;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium capitalize">{f.topic}</span>
                          <span className="text-muted-foreground">+{f.positive} / -{f.negative}</span>
                        </div>
                        <div className="h-2 rounded-full bg-destructive/20 overflow-hidden">
                          <div className="h-full bg-success rounded-full transition-all" style={{ width: `${posPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="clusters" className="mt-3 space-y-2">
                {report.insights.issue_clusters.length === 0 && <EmptyState />}
                {report.insights.issue_clusters.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{c.cluster_name}</span>
                      {c.is_new && <Badge className="text-[10px] bg-primary/20 text-primary border-0">NEW</Badge>}
                      <Badge variant="secondary" className="text-xs ml-auto">{c.frequency}x</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </SectionCard>

          {/* Positive Highlights */}
          {report.positive_highlights?.length > 0 && (
            <SectionCard
              title={t("Positive Highlights", "긍정 하이라이트")}
              id="highlights"
              icon={<Star className="h-4 w-4" />}
              expanded={expandedSections.has("highlights")}
              onToggle={() => toggleSection("highlights")}
            >
              <div className="space-y-2">
                {report.positive_highlights.map((h, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-success/5 border border-success/20">
                    <p className="text-sm italic">"{h.snippet}"</p>
                    <p className="text-xs text-muted-foreground mt-1">{h.context}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Content Recommendations */}
          <SectionCard
            title={t("Content Recommendations", "콘텐츠 활용 추천")}
            id="content"
            icon={<Megaphone className="h-4 w-4" />}
            expanded={expandedSections.has("content")}
            onToggle={() => toggleSection("content")}
          >
            <Tabs defaultValue="pdp" className="w-full">
              <TabsList className="w-full grid grid-cols-5 h-auto p-1 bg-secondary/50">
                <TabsTrigger value="pdp" className="text-[11px] py-1.5">PDP</TabsTrigger>
                <TabsTrigger value="faq" className="text-[11px] py-1.5">FAQ</TabsTrigger>
                <TabsTrigger value="inside" className="text-[11px] py-1.5">Inside</TabsTrigger>
                <TabsTrigger value="outside" className="text-[11px] py-1.5">Outside</TabsTrigger>
                <TabsTrigger value="visual" className="text-[11px] py-1.5">Visual</TabsTrigger>
              </TabsList>

              <TabsContent value="pdp" className="mt-3 space-y-1.5">
                {report.content_recommendations.pdp_updates.map((u, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Eye className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <span>{u}</span>
                  </div>
                ))}
                {report.content_recommendations.pdp_updates.length === 0 && <EmptyState />}
              </TabsContent>

              <TabsContent value="faq" className="mt-3 space-y-2">
                {report.content_recommendations.faq_candidates.map((f, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-border">
                    <p className="text-sm font-medium">Q: {f.q}</p>
                    <p className="text-xs text-muted-foreground mt-1">A: {f.a_outline}</p>
                  </div>
                ))}
                {report.content_recommendations.faq_candidates.length === 0 && <EmptyState />}
              </TabsContent>

              <TabsContent value="inside" className="mt-3 space-y-1.5">
                {report.content_recommendations.inside_channel_copy.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                    <ShieldAlert className="h-3 w-3 inline mr-1.5 text-primary" />
                    {c}
                  </div>
                ))}
                {report.content_recommendations.inside_channel_copy.length === 0 && <EmptyState />}
              </TabsContent>

              <TabsContent value="outside" className="mt-3 space-y-1.5">
                {report.content_recommendations.outside_channel_copy.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-accent/50 border border-accent text-sm">
                    <Megaphone className="h-3 w-3 inline mr-1.5 text-accent-foreground" />
                    {c}
                  </div>
                ))}
                {report.content_recommendations.outside_channel_copy.length === 0 && <EmptyState />}
              </TabsContent>

              <TabsContent value="visual" className="mt-3 space-y-1.5">
                {report.content_recommendations.visual_guidelines.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Image className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <span>{v}</span>
                  </div>
                ))}
                {report.content_recommendations.visual_guidelines.length === 0 && <EmptyState />}
              </TabsContent>
            </Tabs>
          </SectionCard>

          <p className="text-[11px] text-muted-foreground text-center italic">
            {report.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title, id, icon, expanded, onToggle, children,
}: {
  title: string; id: string; icon: React.ReactNode; expanded: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <Card className="border-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && <CardContent className="pt-0 pb-4">{children}</CardContent>}
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/50 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState() {
  return <p className="text-xs text-muted-foreground text-center py-3 italic">No data available</p>;
}
