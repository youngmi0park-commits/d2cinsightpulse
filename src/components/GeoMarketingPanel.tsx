import { useState } from "react";
import { type GeoMessage } from "@/lib/formatMessage";
import { Globe, Copy, Check, Code } from "lucide-react";
import { toast } from "sonner";

interface GeoMarketingPanelProps {
  geoMessages: GeoMessage[];
  productName: string;
}

export function GeoMarketingPanel({ geoMessages, productName }: GeoMarketingPanelProps) {
  const [activeGeo, setActiveGeo] = useState(geoMessages[0]?.geo ?? "us");
  const [activePurpose, setActivePurpose] = useState("sns");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  const currentGeo = geoMessages.find((g) => g.geo === activeGeo);
  const currentMsg = currentGeo?.messages.find((m) => m.purpose === activePurpose)
    ?? currentGeo?.messages[0];

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("클립보드에 복사되었습니다");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyText(text, id)}
      className="shrink-0 p-1.5 rounded-md hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
      title="복사"
    >
      {copiedKey === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="gradient-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-5">
        <Globe className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-semibold font-heading">🌍 지역별 마케팅 메시지</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-5">
        수집된 리뷰 데이터를 기반으로 지역(Geo)과 목적에 맞춰 자동 생성된 마케팅 카피입니다. JSON-LD 구조화 데이터를 포함하여 AI 크롤러·검색엔진 최적화에 적합합니다.
      </p>

      {/* Geo Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
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

      {/* Purpose Tabs */}
      {currentGeo && (
        <div className="flex flex-wrap gap-2 mb-5">
          {currentGeo.messages.map((m) => (
            <button
              key={m.purpose}
              onClick={() => setActivePurpose(m.purpose)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                activePurpose === m.purpose
                  ? "bg-accent border-primary/50 text-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {m.icon} {m.purposeLabel}
            </button>
          ))}
        </div>
      )}

      {/* Message Card */}
      {currentMsg && (
        <div className="space-y-4">
          {/* Headline */}
          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Headline</span>
              <CopyBtn text={currentMsg.headline} id="headline" />
            </div>
            <p className="text-lg font-bold font-heading leading-snug">{currentMsg.headline}</p>
          </div>

          {/* Body */}
          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Body Copy</span>
              <CopyBtn text={currentMsg.body} id="body" />
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{currentMsg.body}</p>
          </div>

          {/* CTA */}
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">Call to Action</span>
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
                  JSON-LD 구조화 데이터 (AI 크롤러 최적화)
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

          {/* Full copy button */}
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
            전체 메시지 복사
          </button>
        </div>
      )}
    </div>
  );
}
