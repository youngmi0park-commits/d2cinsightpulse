import type { MarketingOutput } from "@/lib/formatMessage";
import { Copy, ThumbsUp, Lightbulb, Shield, Star, TrendingUp, AlertTriangle, MapPin, Users, Briefcase, HeadphonesIcon } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MarketingPanelProps {
  marketing: MarketingOutput;
}

export function MarketingPanel({ marketing }: MarketingPanelProps) {
  const { t } = useLang();

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("Copied to clipboard!", "클립보드에 복사되었습니다!"));
  };

  const copyAll = () => {
    const sections = [
      `[${t("Satisfaction Points", "만족 포인트")}]`,
      marketing.strengthsSummary,
      "",
      `[${t("Improvement Areas", "개선 영역")}]`,
      marketing.weaknessesSummary,
      "",
      `[${t("User Tips", "사용자 팁")}]`,
      ...marketing.userTips.map((tip, i) => `${i + 1}. ${tip}`),
      "",
      `[${t("Customer Real Using Scene", "고객 실제 Using Scene")}]`,
      ...marketing.usageScenes.map((scene, i) => `${i + 1}. ${scene}`),
      "",
      `[${t("Durability & Long-term Use", "내구성 & 장기 사용")}]`,
      ...marketing.durabilityInsights.map((ins, i) => `${i + 1}. ${ins}`),
    ].join("\n");
    copyText(sections);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold font-heading">
            {t("Customer Review Highlights", "고객 실사용 리뷰 하이라이트")}
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={copyAll} className="text-xs">
          <Copy className="h-3 w-3 mr-1" />{t("Copy All", "전체 복사")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t(
          "Key insights extracted from real user reviews — satisfaction points, practical tips, usage scenes, and durability feedback at a glance.",
          "실사용자 리뷰에서 추출한 핵심 인사이트 — 만족 포인트, 실용적 사용팁, 실제 사용 장면, 내구성 피드백을 한눈에 확인하세요."
        )}
      </p>

      {/* Satisfaction & Improvement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-1.5">
            <ThumbsUp className="h-4 w-4 text-primary" />
            {t("Satisfaction Points", "만족 포인트")}
          </h4>
          <p className="text-sm text-foreground/90 leading-relaxed">{marketing.strengthsSummary}</p>
        </div>
        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {t("Improvement Areas", "개선 영역")}
          </h4>
          <p className="text-sm text-foreground/90 leading-relaxed">{marketing.weaknessesSummary}</p>
        </div>
      </div>

      {/* User Tips */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            {t("Usage Tips & Recommendations", "사용팁 & 추천")}
          </h4>
          <Button variant="ghost" size="sm" onClick={() => copyText(marketing.userTips.join("\n"))} className="text-xs h-7">
            <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {marketing.userTips.map((tip, i) => (
            <div key={i} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-2.5">
              <span className="text-amber-500 shrink-0 mt-0.5">💡</span>
              <p className="text-sm text-foreground/90 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Target Personas & JTBD side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personas */}
        {marketing.personas && marketing.personas.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="h-4 w-4 text-violet-500" />
                {t("Target Personas", "타겟 페르소나")}
              </h4>
              <Button
                variant="ghost" size="sm"
                onClick={() => copyText(marketing.personas.map(p => `${p.emoji} ${p.label} (${p.age})\n  - ${p.lifestyle}\n  - ${p.motivation}\n  - Pain: ${p.painPoint}`).join("\n\n"))}
                className="text-xs h-7"
              >
                <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
              </Button>
            </div>
            <div className="space-y-2">
              {marketing.personas.map((persona, i) => (
                <div key={i} className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{persona.emoji}</span>
                    <div>
                      <p className="font-semibold text-xs">{persona.label}</p>
                      <p className="text-[10px] text-muted-foreground">{persona.age}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-foreground/80">
                    <p>🎯 {persona.lifestyle}</p>
                    <p>💡 {persona.motivation}</p>
                    <p className="text-destructive/80">⚡ {persona.painPoint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JTBD Insights */}
        {marketing.jtbdInsights && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-blue-500" />
                {t("JTBD Insights", "JTBD 인사이트")}
              </h4>
              <Button
                variant="ghost" size="sm"
                onClick={() => copyText(`[Anxiety] ${marketing.jtbdInsights.anxiety}\n[Delight] ${marketing.jtbdInsights.delight}\n[Switching] ${marketing.jtbdInsights.switchingPoint}`)}
                className="text-xs h-7"
              >
                <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
              </Button>
            </div>
            <div className="bg-muted/40 border border-border rounded-lg p-2.5 mb-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">JTBD (Jobs to be Done)</strong>{" "}
                {t(
                  "— Why did the customer 'hire' this product? Focus on the job, not the person.",
                  "— 고객이 이 제품을 '고용'한 이유는? 사람이 아닌 해결할 과제에 집중합니다."
                )}
              </p>
            </div>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-1">
                <p className="text-xs font-semibold text-orange-600">😰 {t("Pre-Purchase Anxiety", "구매 전 불안")}</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{marketing.jtbdInsights.anxiety}</p>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                <p className="text-xs font-semibold text-emerald-600">😊 {t("Post-Purchase Delight", "구매 후 안도감")}</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{marketing.jtbdInsights.delight}</p>
              </div>
              <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1">
                <p className="text-xs font-semibold text-blue-600">🔄 {t("Switching Point", "전환 포인트")}</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{marketing.jtbdInsights.switchingPoint}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Real Using Scene */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-emerald-500" />
            {t("Customer Real Using Scene", "고객 실제 Using Scene")}
          </h4>
          <Button variant="ghost" size="sm" onClick={() => copyText(marketing.usageScenes.join("\n"))} className="text-xs h-7">
            <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {marketing.usageScenes.map((scene, i) => (
            <div key={i} className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-2.5">
              <span className="shrink-0 mt-0.5">🏠</span>
              <p className="text-sm text-foreground/90 leading-relaxed">{scene}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Durability & Long-term Use */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-primary" />
            {t("Durability & Long-term Use", "내구성 & 장기 사용 의견")}
          </h4>
          <Button variant="ghost" size="sm" onClick={() => copyText(marketing.durabilityInsights.join("\n"))} className="text-xs h-7">
            <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
          </Button>
        </div>
        <div className="space-y-2">
          {marketing.durabilityInsights.map((insight, i) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-secondary/30 flex items-start gap-2.5">
              <span className="shrink-0 mt-0.5">🔧</span>
              <p className="text-sm text-foreground/90 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CRM Insights */}
      {marketing.crmInsights && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <HeadphonesIcon className="h-4 w-4 text-rose-500" />
              {t("CRM & Service Insights", "CRM & 서비스 인사이트")}
            </h4>
            <Button
              variant="ghost" size="sm"
              onClick={() => copyText(`[Expectation Gap] ${marketing.crmInsights.expectationGap}\n[Service Opportunity] ${marketing.crmInsights.serviceOpportunity}\n[CRM Response] ${marketing.crmInsights.crmResponse}`)}
              className="text-xs h-7"
            >
              <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t(
              "Insights from negative reviews — turn complaints into upselling, service opportunities, and CRM actions.",
              "부정 리뷰 기반 인사이트 — 불만을 업셀링, 서비스 기회, CRM 액션으로 전환합니다."
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1">
              <p className="text-xs font-semibold text-rose-600">⚡ {t("Expectation Gap", "기대 괴리")}</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{marketing.crmInsights.expectationGap}</p>
            </div>
            <div className="p-3 rounded-lg border border-amber-600/20 bg-amber-600/5 space-y-1">
              <p className="text-xs font-semibold text-amber-700">💰 {t("Service Opportunity", "서비스 기회")}</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{marketing.crmInsights.serviceOpportunity}</p>
            </div>
            <div className="p-3 rounded-lg border border-sky-500/20 bg-sky-500/5 space-y-1">
              <p className="text-xs font-semibold text-sky-600">🤝 {t("CRM Response", "CRM 대응")}</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{marketing.crmInsights.crmResponse}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Sentiment Tagline */}
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm font-medium text-foreground/90">{marketing.tagline}</p>
      </div>
    </div>
  );
}
