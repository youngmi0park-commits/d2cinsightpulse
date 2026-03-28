import { useState } from "react";
import { MarketingPanel } from "@/components/MarketingPanel";
import { FaqToolkitPanel } from "@/components/FaqToolkitPanel";
import { ContentCreatorPanel } from "@/components/ContentCreatorPanel";
import { useLang } from "@/contexts/LanguageContext";
import {
  Star, Wrench, Palette, Copy, ThumbsUp, AlertTriangle,
  Lightbulb, Users, Shield, Briefcase, TrendingUp, ChevronDown,
  Target, Megaphone, Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { GeoMessage } from "@/lib/formatMessage";
import type { MarketingOutput } from "@/lib/formatMessage";
import type { SentimentResult } from "@/lib/sentiment";

interface MarketingHubProps {
  geoMessages: GeoMessage[];
  productName: string;
  displayName: string;
  totalReviews: number;
  marketing: MarketingOutput;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string; source?: string }[];
}

/* ── keyword extractor ── */
const STOP = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "is","it","was","are","were","be","been","have","has","had","this","that",
  "from","as","not","so","very","just","i","my","me","we","our","you","your",
  "they","their","its","no","do","does","did","will","would","can","could",
  "should","about","all","one","two","if","up","out","more","also","than",
  "then","into","over","after","only","any","each","which","what","when",
  "some","other","new","like","get","got","much","really","product","lg",
  "good","great","review","use","used","using","bought","buy","still",
]);

function extractKw(texts: string[], limit = 6) {
  const freq: Record<string, number> = {};
  for (const t of texts) {
    const words = t.toLowerCase().replace(/[^a-z0-9\s'-]/g, "").split(/\s+/);
    const seen = new Set<string>();
    for (const w of words) {
      if (w.length < 3 || STOP.has(w) || seen.has(w)) continue;
      seen.add(w);
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w, c]) => ({ word: w, count: c }));
}

/* ── step header ── */
function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 mb-4 border-b-2 border-border">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
        {step}
      </span>
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function MarketingHub({
  geoMessages,
  productName,
  displayName,
  totalReviews,
  marketing,
  sentiment,
  reviews,
}: MarketingHubProps) {
  const { t } = useLang();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    step1: true, step2: true, step3: false, step4: false,
  });

  const toggleSection = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const copyText = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label || t("Copied!", "복사 완료!"));
  };

  // Derived data
  const posReviews = reviews.filter((r) => r.sentiment === "positive");
  const negReviews = reviews.filter((r) => r.sentiment === "negative");
  const posKw = extractKw(posReviews.map((r) => r.text));
  const negKw = extractKw(negReviews.map((r) => r.text));
  const posPercent = totalReviews > 0 ? Math.round((posReviews.length / totalReviews) * 100) : 0;
  const negPercent = totalReviews > 0 ? Math.round((negReviews.length / totalReviews) * 100) : 0;

  return (
    <div className="gradient-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold font-heading text-foreground tracking-tight">
            Marketing Toolkit
          </h2>
          <Badge variant="secondary" className="text-[10px] ml-2">
            {totalReviews}건 리뷰 기반
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {displayName || productName}의 실제 고객 리뷰를 분석하여 바로 활용 가능한 마케팅 액션을 제공합니다.
        </p>
      </div>

      <div className="p-6 space-y-6">

        {/* ═══ STEP 1: Review Snapshot ═══ */}
        <Collapsible open={openSections.step1} onOpenChange={() => toggleSection("step1")}>
          <CollapsibleTrigger className="w-full">
            <StepHeader step={1} title="Review Snapshot" subtitle="감성 분포 · 주요 키워드 · 핵심 인사이트 요약" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            {/* Sentiment summary bar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-center">
                <ThumbsUp className="h-4 w-4 text-success mx-auto mb-1" />
                <div className="text-2xl font-bold text-success">{posPercent}%</div>
                <div className="text-[10px] text-muted-foreground">긍정 ({posReviews.length}건)</div>
              </div>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
                <AlertTriangle className="h-4 w-4 text-destructive mx-auto mb-1" />
                <div className="text-2xl font-bold text-destructive">{negPercent}%</div>
                <div className="text-[10px] text-muted-foreground">부정 ({negReviews.length}건)</div>
              </div>
            </div>

            {/* Keywords */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-success uppercase tracking-wider mb-2">✅ 긍정 키워드</p>
                <div className="flex flex-wrap gap-1">
                  {posKw.map((kw) => (
                    <Badge key={kw.word} variant="outline" className="text-[10px] border-success/30 text-success">
                      {kw.word} ({kw.count})
                    </Badge>
                  ))}
                  {posKw.length === 0 && <span className="text-[10px] text-muted-foreground">데이터 부족</span>}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-2">⚠️ 부정 키워드</p>
                <div className="flex flex-wrap gap-1">
                  {negKw.map((kw) => (
                    <Badge key={kw.word} variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                      {kw.word} ({kw.count})
                    </Badge>
                  ))}
                  {negKw.length === 0 && <span className="text-[10px] text-muted-foreground">데이터 부족</span>}
                </div>
              </div>
            </div>

            {/* Strength / Weakness */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-success/20 bg-success/5">
                <p className="text-xs font-semibold text-success mb-1">💪 만족 포인트</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{marketing.strengthsSummary}</p>
              </div>
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <p className="text-xs font-semibold text-destructive mb-1">🔧 개선 영역</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{marketing.weaknessesSummary}</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ STEP 2: Persona & Strategy ═══ */}
        <Collapsible open={openSections.step2} onOpenChange={() => toggleSection("step2")}>
          <CollapsibleTrigger className="w-full">
            <StepHeader step={2} title="Target Persona & Strategy" subtitle="페르소나 · JTBD · Defense/Offense 메시징 전략" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            {/* Personas */}
            {marketing.personas && marketing.personas.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <Users className="h-3 w-3 inline mr-1" />TARGET PERSONAS
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {marketing.personas.map((p, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-secondary/20">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">{p.emoji}</span>
                        <div>
                          <p className="text-xs font-bold">{p.label}</p>
                          <p className="text-[9px] text-muted-foreground">{p.age}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-foreground/70">🎯 {p.lifestyle}</p>
                      <p className="text-[10px] text-foreground/70">💡 {p.motivation}</p>
                      <p className="text-[10px] text-destructive/70">⚡ {p.painPoint}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JTBD */}
            {marketing.jtbdInsights && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-destructive/15 bg-destructive/5">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">
                    🛡 DEFENSE — 구매 전 불안 해소
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{marketing.jtbdInsights.anxiety}</p>
                </div>
                <div className="p-3 rounded-lg border border-success/15 bg-success/5">
                  <p className="text-[10px] font-bold text-success uppercase tracking-wide mb-2">
                    ⚡ OFFENSE — 구매 후 만족 강화
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{marketing.jtbdInsights.delight}</p>
                </div>
              </div>
            )}

            {/* Usage Tips */}
            {marketing.userTips.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <Lightbulb className="h-3 w-3 inline mr-1" />USAGE TIPS
                  </p>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => copyText(marketing.userTips.join("\n"))}>
                    <Copy className="h-3 w-3 mr-1" />복사
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {marketing.userTips.map((tip, i) => (
                    <div key={i} className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-foreground/80 flex gap-2">
                      <span className="shrink-0">💡</span>
                      <span className="leading-relaxed">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ STEP 3: FAQ & Content ═══ */}
        <Collapsible open={openSections.step3} onOpenChange={() => toggleSection("step3")}>
          <CollapsibleTrigger className="w-full">
            <StepHeader step={3} title="AI FAQ & Content Creator" subtitle="리뷰 기반 FAQ 자동 생성 · 채널별 콘텐츠 제작" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <FaqToolkitPanel
              productName={productName}
              displayName={displayName}
              sentiment={sentiment}
              reviews={reviews}
              locale="en-US"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ STEP 4: Content Creator ═══ */}
        <Collapsible open={openSections.step4} onOpenChange={() => toggleSection("step4")}>
          <CollapsibleTrigger className="w-full">
            <StepHeader step={4} title="Ad Copy & Banner Generation" subtitle="채널별 광고 카피 · 배너 소재 자동 생성" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ContentCreatorPanel
              productName={productName}
              displayName={displayName}
              sentiment={sentiment}
              reviews={reviews}
              marketing={marketing}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* CRM Insights */}
        {marketing.crmInsights && (
          <div className="border-t border-border pt-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              📞 CRM & SERVICE INSIGHTS
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                <p className="text-[10px] font-semibold text-rose-600 mb-1">⚡ 기대 괴리</p>
                <p className="text-[10px] text-foreground/80 leading-relaxed">{marketing.crmInsights.expectationGap}</p>
              </div>
              <div className="p-3 rounded-lg border border-amber-600/20 bg-amber-600/5">
                <p className="text-[10px] font-semibold text-amber-700 mb-1">💰 서비스 기회</p>
                <p className="text-[10px] text-foreground/80 leading-relaxed">{marketing.crmInsights.serviceOpportunity}</p>
              </div>
              <div className="p-3 rounded-lg border border-sky-500/20 bg-sky-500/5">
                <p className="text-[10px] font-semibold text-sky-600 mb-1">🤝 CRM 대응</p>
                <p className="text-[10px] text-foreground/80 leading-relaxed">{marketing.crmInsights.crmResponse}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tagline */}
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs font-medium text-foreground/90">{marketing.tagline}</p>
        </div>
      </div>
    </div>
  );
}
