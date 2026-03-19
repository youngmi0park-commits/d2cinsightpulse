import { useState, useMemo } from "react";
import { type GeoMessage, type ChannelGroup, toPRName } from "@/lib/formatMessage";
import { Globe, Copy, Check, Code, Building2, Megaphone, MessageSquareQuote, Puzzle } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { AdComplianceNotice } from "@/components/AdComplianceNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateMarketerToolkit } from "@/lib/marketerToolkit";
import type { SentimentResult } from "@/lib/sentiment";

const TAG_COLORS: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  negative: "bg-red-500/10 text-red-400 border-red-500/20",
  confusion: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  expectation: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};
const TAG_LABELS: Record<string, string> = {
  positive: "Positive", negative: "Negative", confusion: "Confusion", expectation: "Expectation",
};

interface GeoMarketingPanelProps {
  geoMessages: GeoMessage[];
  productName: string;
  totalReviews: number;
  displayName?: string;
  sentiment?: SentimentResult;
  reviews?: { text: string; sentiment?: string }[];
}

const CHANNEL_GROUPS: { key: ChannelGroup; icon: typeof Building2; labelEn: string; labelKo: string; descEn: string; descKo: string }[] = [
  {
    key: "inside",
    icon: Building2,
    labelEn: "Inside Channel",
    labelKo: "Inside Channel",
    descEn: "Dotcom, Internal Communications",
    descKo: "닷컴, 내부 커뮤니케이션",
  },
  {
    key: "outside",
    icon: Megaphone,
    labelEn: "Outside Channel",
    labelKo: "Outside Channel",
    descEn: "SNS, Paid Ads, Influencer Review Guides",
    descKo: "SNS, 유료광고, 인플루언서 리뷰 가이드",
  },
];

export function GeoMarketingPanel({ geoMessages, productName, totalReviews, displayName, sentiment, reviews }: GeoMarketingPanelProps) {
  const [activeGeo, setActiveGeo] = useState(geoMessages[0]?.geo ?? "LGEUS");
  const [activeChannel, setActiveChannel] = useState<ChannelGroup>("inside");
  const [activePurpose, setActivePurpose] = useState("dotcom");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const { t } = useLang();

  const currentGeo = geoMessages.find((g) => g.geo === activeGeo);
  const channelMessages = currentGeo?.messages.filter((m) => m.channelGroup === activeChannel) ?? [];
  const currentMsg = channelMessages.find((m) => m.purpose === activePurpose) ?? channelMessages[0];

  // Sync activePurpose when switching channels
  const handleChannelSwitch = (ch: ChannelGroup) => {
    setActiveChannel(ch);
    const msgs = currentGeo?.messages.filter((m) => m.channelGroup === ch) ?? [];
    if (msgs.length > 0 && !msgs.find((m) => m.purpose === activePurpose)) {
      setActivePurpose(msgs[0].purpose);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(t("Copied to clipboard", "클립보드에 복사되었습니다"));
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyText(text, id)}
      className="shrink-0 p-1.5 rounded-md hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
      title={t("Copy", "복사")}
    >
      {copiedKey === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-semibold font-heading">🌍 {t("Channel Marketing Copy Generator", "채널별 마케팅 카피 생성")}</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-5">
        {t(
          "Auto-generated marketing copy tailored by channel type, region, and purpose based on collected review data.",
          "수집된 리뷰 데이터를 기반으로 채널 유형·지역(Geo)·목적에 맞춰 자동 생성된 마케팅 카피입니다."
        )}
      </p>

      {/* Channel Group Tabs (Inside / Outside) */}
      <div className="flex gap-3 mb-5">
        {CHANNEL_GROUPS.map((ch) => {
          const Icon = ch.icon;
          const isActive = activeChannel === ch.key;
          return (
            <button
              key={ch.key}
              onClick={() => handleChannelSwitch(ch.key)}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                isActive
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-secondary/20 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground/80"}`}>
                  {t(ch.labelEn, ch.labelKo)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{t(ch.descEn, ch.descKo)}</p>
            </button>
          );
        })}
      </div>

      {/* Purpose Tabs within selected channel */}
      {channelMessages.length > 0 && (
        <div className="flex items-start gap-3 mb-4 p-3 rounded-lg border border-border bg-secondary/20">
          <span className="shrink-0 text-xs font-medium text-muted-foreground mt-1 min-w-[60px]">
            {t("Exposure Type", "노출타입")}
          </span>
          <div className="flex flex-wrap gap-2">
            {channelMessages.map((m) => (
              <button
                key={m.purpose}
                onClick={() => setActivePurpose(m.purpose)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  activePurpose === m.purpose || (currentMsg?.purpose === m.purpose && activePurpose !== m.purpose)
                    ? "bg-primary border-primary/50 text-primary-foreground"
                    : "bg-background border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {m.icon} {m.purposeLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Geo Tabs */}
      <div className="flex items-start gap-3 mb-5 p-3 rounded-lg border border-border bg-secondary/20">
        <span className="shrink-0 text-xs font-medium text-muted-foreground mt-1.5 min-w-[60px]">
          {t("Country", "국가")}
        </span>
        <div className="flex flex-wrap gap-2">
          {geoMessages.map((g) => (
            <button
              key={g.geo}
              onClick={() => {
                setActiveGeo(g.geo);
                const msgs = geoMessages.find(x => x.geo === g.geo)?.messages.filter(m => m.channelGroup === activeChannel) ?? [];
                if (msgs.length > 0 && !msgs.find(m => m.purpose === activePurpose)) {
                  setActivePurpose(msgs[0].purpose);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                activeGeo === g.geo
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {g.flag} <span className="font-mono text-xs">{g.geo}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Card */}
      {currentMsg && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-sm text-yellow-700 dark:text-yellow-400">
            ⚠️ {t(
              "This message has been pre-screened against the Overseas Advertising Checklist; however, a mandatory legal review must be completed before actual use.",
              "본 메시지는 해외광고체크리스트 사전 검수를 완료하였으나, 실제 활용 전 법무 검토를 필수 진행하여 주시기 바랍니다."
            )}
          </div>

          {/* Purpose-specific guidelines */}
          {(activePurpose === "dotcom" || activePurpose?.startsWith("dotcom_alt")) && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{t("Dotcom Copy Guidelines", "닷컴 카피 가이드라인")}</span>
              <span className="ml-2">
                {t(
                  "(Ref: lg.com/us, lg.com/uk hero banners) Kicker ≤35 chars · Headline ≤50 chars · Body ≤120 chars · CTA ≤20 chars",
                  "(참고: lg.com/us, lg.com/uk 히어로 배너) Kicker ≤35자 · Headline ≤50자 · Body ≤120자 · CTA ≤20자"
                )}
              </span>
            </div>
          )}
          {activePurpose === "criteo" && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Criteo Guidelines</span>
              <span className="ml-2">Headline ≤25 chars · Description ≤45 chars · CTA ≤15 chars · Image: 300×250, 728×90, 160×600</span>
            </div>
          )}
          {activePurpose === "pmax" && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Google Pmax Guidelines</span>
              <span className="ml-2">Headline ≤30 chars · Long Headline ≤90 chars · Description ≤90 chars · Images: 1200×628, 1200×1200, 960×1200</span>
            </div>
          )}
          {activePurpose === "influencer" && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{t("Influencer Review Guide", "인플루언서 리뷰 가이드")}</span>
              <span className="ml-2">
                {t(
                  "Talking points for influencer partners. Must include #Sponsored / #Ad disclosure. Authentic tone recommended.",
                  "인플루언서 파트너용 토킹 포인트. #Sponsored / #Ad 표기 필수. 진정성 있는 톤 권장."
                )}
              </span>
            </div>
          )}
          {activePurpose === "internal" && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{t("Internal Communication", "내부 커뮤니케이션")}</span>
              <span className="ml-2">
                {t(
                  "For internal stakeholders only. Contains raw sentiment data and improvement areas. NOT for external use.",
                  "내부 관계자 전용. 원시 감성 데이터 및 개선 영역 포함. 외부 사용 불가."
                )}
              </span>
            </div>
          )}

          {/* Ad Product Specs Guide (only for outside channel ad types) */}
          {activeChannel === "outside" && (activePurpose === "criteo" || activePurpose === "pmax") && (
            <div className="p-3 rounded-lg border border-border bg-secondary/20 text-xs space-y-2">
              <span className="font-semibold text-foreground/80">{t("📋 Ad Product Specs Guide", "📋 광고상품별 스펙 가이드")}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div className="p-2.5 rounded-md border border-border bg-background/60">
                  <div className="font-semibold text-primary mb-1">Criteo (Display / Retargeting)</div>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Headline: {t("≤25 chars", "≤25자")}</li>
                    <li>• Description: {t("≤45 chars", "≤45자")}</li>
                    <li>• CTA: {t("≤15 chars (predefined buttons recommended)", "≤15자 (사전정의 버튼 권장)")}</li>
                    <li>• Logo: {t("Brand logo auto-applied", "브랜드 로고 자동 적용")}</li>
                    <li>• {t("Image: 300×250, 728×90, 160×600 etc.", "이미지: 300×250, 728×90, 160×600 등")}</li>
                    <li>• {t("Text overlay ≤20% of creative area", "텍스트 오버레이 ≤ 크리에이티브 영역의 20%")}</li>
                  </ul>
                </div>
                <div className="p-2.5 rounded-md border border-border bg-background/60">
                  <div className="font-semibold text-primary mb-1">Google Performance Max (Pmax)</div>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Headline: {t("≤30 chars (up to 5)", "≤30자 (최대 5개)")}</li>
                    <li>• Long Headline: {t("≤90 chars (up to 5)", "≤90자 (최대 5개)")}</li>
                    <li>• Description: {t("≤90 chars (up to 5)", "≤90자 (최대 5개)")}</li>
                    <li>• Business Name: {t("≤25 chars", "≤25자")}</li>
                    <li>• CTA: {t("Auto-generated or selectable", "자동 생성 또는 선택 가능")}</li>
                    <li>• {t("Images: 1200×628 (landscape), 1200×1200 (square), 960×1200 (portrait)", "이미지: 1200×628 (가로), 1200×1200 (정사각), 960×1200 (세로)")}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Kicker / Eyebrow (dotcom only) */}
          {currentMsg.kicker && (
            <div className="p-3 rounded-lg border border-border bg-secondary/30">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Kicker / Eyebrow</span>
                  <span className={`text-[10px] font-mono ${currentMsg.kicker.length > 35 ? "text-destructive" : "text-green-600"}`}>
                    ({currentMsg.kicker.length}/35)
                  </span>
                </div>
                <CopyBtn text={currentMsg.kicker} id="kicker" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{currentMsg.kicker}</p>
            </div>
          )}

          {/* Headline */}
          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Headline</span>
                {(activePurpose === "dotcom" || activePurpose?.startsWith("dotcom_alt")) && (
                  <span className={`text-[10px] font-mono ${currentMsg.headline.length > 50 ? "text-destructive" : "text-green-600"}`}>
                    ({currentMsg.headline.length}/50)
                  </span>
                )}
                {activePurpose === "criteo" && (
                  <span className={`text-[10px] font-mono ${currentMsg.headline.length > 25 ? "text-destructive" : "text-green-600"}`}>
                    ({currentMsg.headline.length}/25)
                  </span>
                )}
                {activePurpose === "pmax" && (
                  <span className={`text-[10px] font-mono ${currentMsg.headline.length > 30 ? "text-destructive" : "text-green-600"}`}>
                    ({currentMsg.headline.length}/30)
                  </span>
                )}
              </div>
              <CopyBtn text={currentMsg.headline} id="headline" />
            </div>
            <p className="text-lg font-bold font-heading leading-snug">{currentMsg.headline}</p>
          </div>

          {/* Body */}
          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Body Copy</span>
                {(activePurpose === "dotcom" || activePurpose?.startsWith("dotcom_alt")) && (
                  <span className={`text-[10px] font-mono ${currentMsg.body.length > 120 ? "text-destructive" : "text-green-600"}`}>
                    ({currentMsg.body.length}/120)
                  </span>
                )}
                {activePurpose === "criteo" && (
                  <span className={`text-[10px] font-mono ${currentMsg.body.length > 45 ? "text-destructive" : "text-green-600"}`}>
                    ({currentMsg.body.length}/45)
                  </span>
                )}
                {activePurpose === "pmax" && (
                  <span className={`text-[10px] font-mono ${currentMsg.body.length > 90 ? "text-destructive" : "text-green-600"}`}>
                    ({currentMsg.body.length}/90)
                  </span>
                )}
              </div>
              <CopyBtn text={currentMsg.body} id="body" />
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{currentMsg.body}</p>
          </div>

          {/* CTA */}
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Call to Action</span>
                  {activePurpose === "dotcom" && (
                    <span className={`text-[10px] font-mono ${currentMsg.cta.length > 20 ? "text-destructive" : "text-green-600"}`}>
                      ({currentMsg.cta.length}/20)
                    </span>
                  )}
                  {activePurpose === "criteo" && (
                    <span className={`text-[10px] font-mono ${currentMsg.cta.length > 15 ? "text-destructive" : "text-green-600"}`}>
                      ({currentMsg.cta.length}/15)
                    </span>
                  )}
                </div>
                <p className="font-semibold text-primary">{currentMsg.cta}</p>
              </div>
              <CopyBtn text={currentMsg.cta} id="cta" />
            </div>
          </div>

          {/* Hashtags */}
          {currentMsg.hashtags.length > 0 && (
            <div className="p-4 rounded-lg border border-border bg-secondary/30">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hashtags</span>
                <CopyBtn text={currentMsg.hashtags.join(" ")} id="hashtags" />
              </div>
              <div className="flex flex-wrap gap-2">
                {currentMsg.hashtags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* JSON-LD Schema */}
          {currentMsg.schema && (
            <div className="p-4 rounded-lg border border-border bg-secondary/30">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setShowSchema(!showSchema)}
                  className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider hover:text-primary transition-colors"
                >
                  <Code className="h-4 w-4" />
                  {t("JSON-LD Structured Data (AI Crawler Optimized)", "JSON-LD 구조화 데이터 (AI 크롤러 최적화)")}
                  <span className="text-[10px]">{showSchema ? "▲" : "▼"}</span>
                </button>
                <CopyBtn text={JSON.stringify(currentMsg.schema, null, 2)} id="schema" />
              </div>
              {showSchema && (
                <pre className="text-xs text-muted-foreground bg-background/80 rounded-md p-3 overflow-x-auto font-mono leading-relaxed">
                  {JSON.stringify(currentMsg.schema, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Copy Full */}
          <button
            onClick={() =>
              copyText(
                `[${currentMsg.purposeLabel}] — ${currentGeo?.geoLabel}\n\n📌 Headline:\n${currentMsg.headline}\n\n📝 Body:\n${currentMsg.body}\n\n🔗 CTA:\n${currentMsg.cta}${currentMsg.hashtags.length > 0 ? `\n\n# Hashtags:\n${currentMsg.hashtags.join(" ")}` : ""}`,
                "full"
              )
            }
            className="w-full py-3 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
          >
            {copiedKey === "full" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {t("Copy Full Message", "전체 메시지 복사")}
          </button>

          {/* Ad Compliance Notice */}
          <AdComplianceNotice
            purpose={activePurpose}
            geo={activeGeo}
            productName={productName}
            totalReviews={totalReviews}
          />
        </div>
      )}
    </div>
  );
}
