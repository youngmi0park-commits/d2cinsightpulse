import { useState } from "react";
import { type GeoMessage } from "@/lib/formatMessage";
import { Globe, Copy, Check, Code } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { AdComplianceNotice } from "@/components/AdComplianceNotice";

interface GeoMarketingPanelProps {
  geoMessages: GeoMessage[];
  productName: string;
  totalReviews: number;
}

export function GeoMarketingPanel({ geoMessages, productName, totalReviews }: GeoMarketingPanelProps) {
  const [activeGeo, setActiveGeo] = useState(geoMessages[0]?.geo ?? "us");
  const [activePurpose, setActivePurpose] = useState("sns");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const { t } = useLang();

  const currentGeo = geoMessages.find((g) => g.geo === activeGeo);
  const currentMsg = currentGeo?.messages.find((m) => m.purpose === activePurpose)
    ?? currentGeo?.messages[0];

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
    <div className="gradient-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-semibold font-heading">🌍 {t("Regional Marketing Messages", "지역별 마케팅 메시지")}</h3>
      </div>


      <p className="text-sm text-muted-foreground mb-5">
        {t(
          "Auto-generated marketing copy tailored by region and purpose based on collected review data. Includes JSON-LD structured data optimized for AI crawlers and search engines.",
          "수집된 리뷰 데이터를 기반으로 지역(Geo)과 목적에 맞춰 자동 생성된 마케팅 카피입니다. JSON-LD 구조화 데이터를 포함하여 AI 크롤러·검색엔진 최적화에 적합합니다."
        )}
      </p>

      {/* Purpose Tabs */}
      {currentGeo && (
        <div className="flex flex-wrap gap-2 mb-4">
          {currentGeo.messages.map((m) => (
            <button
              key={m.purpose}
              onClick={() => setActivePurpose(m.purpose)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                activePurpose === m.purpose
                  ? "bg-primary border-primary/50 text-primary-foreground"
                  : "bg-background border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {m.icon} {m.purposeLabel}
            </button>
          ))}
        </div>
      )}

      {/* Geo Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {geoMessages.map((g) => (
          <button
            key={g.geo}
            onClick={() => { setActiveGeo(g.geo); setActivePurpose(geoMessages.find(x => x.geo === g.geo)?.messages[0]?.purpose ?? "sns"); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              activeGeo === g.geo
                ? "bg-primary/20 border-primary text-primary"
                : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            {g.flag} {g.geoLabel}
          </button>
        ))}
      </div>

      {/* Message Card */}
      {currentMsg && (
        <div className="space-y-4">
          {activePurpose === "banner" && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{t("Banner Copy Guidelines", "배너 문구 가이드라인")}</span>
              <span className="ml-2">
                {t(
                  "(Based on lg.com hero banner) Headline ≤50 chars · Body ≤120 chars · CTA ≤20 chars",
                  "(lg.com 히어로 배너 기준) Headline ≤50자 · Body ≤120자 · CTA ≤20자"
                )}
              </span>
            </div>
          )}

          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Headline</span>
                {activePurpose === "banner" && (
                  <span className={`text-[10px] font-mono ${currentMsg.headline.length > 50 ? "text-red-500" : "text-green-600"}`}>
                    ({currentMsg.headline.length}/50)
                  </span>
                )}
              </div>
              <CopyBtn text={currentMsg.headline} id="headline" />
            </div>
            <p className="text-lg font-bold font-heading leading-snug">{currentMsg.headline}</p>
          </div>

          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Body Copy</span>
                {activePurpose === "banner" && (
                  <span className={`text-[10px] font-mono ${currentMsg.body.length > 120 ? "text-red-500" : "text-green-600"}`}>
                    ({currentMsg.body.length}/120)
                  </span>
                )}
              </div>
              <CopyBtn text={currentMsg.body} id="body" />
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{currentMsg.body}</p>
          </div>

          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Call to Action</span>
                  {activePurpose === "banner" && (
                    <span className={`text-[10px] font-mono ${currentMsg.cta.length > 20 ? "text-red-500" : "text-green-600"}`}>
                      ({currentMsg.cta.length}/20)
                    </span>
                  )}
                </div>
                <p className="font-semibold text-primary">{currentMsg.cta}</p>
              </div>
              <CopyBtn text={currentMsg.cta} id="cta" />
            </div>
          </div>

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
