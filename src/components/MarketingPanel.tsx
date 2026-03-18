import type { MarketingOutput } from "@/lib/formatMessage";
import { Copy, ThumbsUp, Lightbulb, Shield, Star, TrendingUp, AlertTriangle, MapPin } from "lucide-react";
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
    <div className="gradient-card rounded-xl border border-border p-6 space-y-5">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyText(marketing.userTips.join("\n"))}
            className="text-xs h-7"
          >
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

      {/* Customer Real Using Scene */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-emerald-500" />
            {t("Customer Real Using Scene", "고객 실제 Using Scene")}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyText(marketing.usageScenes.join("\n"))}
            className="text-xs h-7"
          >
            <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            "Real places and situations where customers use this product — valuable references for marketing creatives and ad targeting.",
            "고객이 실제로 이 제품을 사용하는 장소와 상황 — 마케팅 크리에이티브 기획 및 광고 타겟팅에 유용한 레퍼런스입니다."
          )}
        </p>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyText(marketing.durabilityInsights.join("\n"))}
            className="text-xs h-7"
          >
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

      {/* Overall Sentiment Tagline */}
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm font-medium text-foreground/90">{marketing.tagline}</p>
      </div>
    </div>
  );
}