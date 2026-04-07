import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";

/* ━━━━━━━━━━ Types ━━━━━━━━━━ */
type Funnel = "awareness" | "consideration" | "conversion" | "retention";
type ContentType = "adCopy" | "faq" | "seo" | "image";

interface Platform {
  key: string;
  label: string;
  group: string;
}

interface MarketingAssetStudioProps {
  categoryName: string;
  sentimentScore: number;
  positivePct: number;
  negativePct: number;
  totalReviews: number;
  topPositivePoints: string[];
  topNegativePoints: string[];
  bestReviewQuote: string;
  sources: Record<string, number>;
}

/* ━━━━━━━━━━ Constants ━━━━━━━━━━ */
const FUNNELS: { key: Funnel; icon: string; label: string }[] = [
  { key: "awareness", icon: "📣", label: "인지도 제고" },
  { key: "consideration", icon: "🤔", label: "구매 고려" },
  { key: "conversion", icon: "🛒", label: "구매 전환" },
  { key: "retention", icon: "🔄", label: "재구매·로열티" },
];

const FUNNEL_STYLES: Record<Funnel, { bg: string; border: string; text: string }> = {
  awareness:     { bg: "#EFF6FF", border: "#1D4ED8", text: "#1D4ED8" },
  consideration: { bg: "#FFFBEB", border: "#B45309", text: "#B45309" },
  conversion:    { bg: "#FEF2F2", border: "#A50034", text: "#A50034" },
  retention:     { bg: "#F0FDF4", border: "#006600", text: "#006600" },
};

const CONTENT_TYPES: { key: ContentType; icon: string; label: string; bg: string; border: string; text: string }[] = [
  { key: "adCopy", icon: "⚡", label: "광고 카피", bg: "#EFF6FF", border: "#1D4ED8", text: "#1D4ED8" },
  { key: "faq",    icon: "❓", label: "FAQ 콘텐츠", bg: "#FFFBEB", border: "#B45309", text: "#B45309" },
  { key: "seo",    icon: "📝", label: "SEO·GEO", bg: "#F0FDF4", border: "#006600", text: "#006600" },
  { key: "image",  icon: "🎨", label: "이미지 에셋", bg: "#FAF5FF", border: "#7C3AED", text: "#7C3AED" },
];

const PLATFORMS: Platform[] = [
  // Search & Performance
  { key: "pmax",         label: "Google PMAX",      group: "Search & Performance" },
  { key: "searchAd",     label: "Google Search Ad",  group: "Search & Performance" },
  { key: "youtube",      label: "YouTube Ads",       group: "Search & Performance" },
  // Meta
  { key: "metaFeed",     label: "Meta Feed",         group: "Meta (Facebook / Instagram)" },
  { key: "metaStories",  label: "Meta Stories / Reels", group: "Meta (Facebook / Instagram)" },
  // Display
  { key: "gdn",          label: "GDN Banner",        group: "Display & Native" },
  { key: "native",       label: "Native Ad",         group: "Display & Native" },
  // E-commerce
  { key: "amazonSP",     label: "Amazon Sponsored",  group: "E-commerce" },
  { key: "bestbuyAd",    label: "BestBuy Ad",        group: "E-commerce" },
];

/* ━━━━━━━━━━ Helpers ━━━━━━━━━━ */
function scoreColor(s: number) {
  if (s >= 80) return "#15803D";
  if (s >= 60) return "#D97706";
  return "#DC2626";
}

function truncate(str: string, max: number) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max) + "...";
}

/* ━━━━━━━━━━ Component ━━━━━━━━━━ */
export function MarketingAssetStudio({
  categoryName,
  sentimentScore,
  positivePct,
  negativePct,
  totalReviews,
  topPositivePoints,
  topNegativePoints,
  bestReviewQuote,
  sources,
}: MarketingAssetStudioProps) {
  const [funnel, setFunnel] = useState<Funnel>("conversion");
  const [types, setTypes] = useState<Set<ContentType>>(new Set(["adCopy"]));
  const [platforms, setPlatforms] = useState<Set<string>>(new Set());

  const neutralPct = Math.max(0, 100 - positivePct - negativePct);

  const toggleType = (t: ContentType) => {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const showPlatforms = types.has("adCopy") || types.has("image");

  /* Quick action presets */
  const applyPreset = useCallback((preset: {
    funnel: Funnel;
    types: ContentType[];
    platforms?: string[];
  }) => {
    setFunnel(preset.funnel);
    setTypes(new Set(preset.types));
    if (preset.platforms) setPlatforms(new Set(preset.platforms));
    // TODO: trigger generation
  }, []);

  return (
    <div className="space-y-4">
      {/* ━━━ Divider ━━━ */}
      <div className="flex items-center gap-3 mt-8 mb-5">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3">
          ✦ 리뷰 기반 마케팅 에셋 스튜디오
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ━━━ 1. REVIEW INSIGHT SUMMARY STRIP ━━━ */}
      <div className="relative overflow-hidden" style={{ borderRadius: 12 }}>
        <div
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          style={{
            background: "#0f1c2e",
            padding: "14px 20px",
            borderRadius: 12,
          }}
        >
          {/* KPI 1: Sentiment */}
          <div className="flex flex-col items-center md:items-start gap-0.5">
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Sentiment Score</span>
            <span className="text-2xl font-bold" style={{ color: scoreColor(sentimentScore) }}>{sentimentScore}</span>
          </div>
          {/* KPI 2: Total Reviews */}
          <div className="flex flex-col items-center md:items-start gap-0.5">
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Total Reviews</span>
            <span className="text-2xl font-bold text-white">{totalReviews.toLocaleString()}</span>
          </div>
          {/* KPI 3: Positive% */}
          <div className="flex flex-col items-center md:items-start gap-0.5">
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Positive %</span>
            <span className="text-2xl font-bold" style={{ color: "#22C55E" }}>{positivePct}%</span>
          </div>
          {/* KPI 4: Insight bullets */}
          <div className="space-y-1">
            {topPositivePoints[0] && (
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                📈 {truncate(topPositivePoints[0], 30)} — 소구 포인트
              </p>
            )}
            {topNegativePoints[0] && (
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                ⚠️ {truncate(topNegativePoints[0], 30)} — FAQ 선제 대응 필요
              </p>
            )}
            {bestReviewQuote && (
              <p className="text-[11px] italic" style={{ color: "rgba(255,255,255,0.5)" }}>
                "{truncate(bestReviewQuote, 40)}"
              </p>
            )}
          </div>
        </div>
        {/* 3-segment bar */}
        <div className="flex" style={{ height: 3, borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
          <div style={{ width: `${positivePct}%`, background: "#22C55E" }} />
          <div style={{ width: `${neutralPct}%`, background: "#9CA3AF" }} />
          <div style={{ width: `${negativePct}%`, background: "#EF4444" }} />
        </div>
      </div>

      {/* ━━━ 2. QUICK ACTION BAR ━━━ */}
      <div className="border border-border rounded-xl p-3 px-4 bg-card flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">⚡ 빠른 생성</span>
        <div className="w-px h-6 bg-border shrink-0" />

        {[
          { label: "🔵 PMAX 에셋", preset: { funnel: "conversion" as Funnel, types: ["adCopy" as ContentType], platforms: ["pmax"] } },
          { label: "🔷 Meta 전환 광고", preset: { funnel: "conversion" as Funnel, types: ["adCopy" as ContentType], platforms: ["metaFeed", "metaStories"] } },
          { label: "❓ PDP FAQ", preset: { funnel: "consideration" as Funnel, types: ["faq" as ContentType] } },
          { label: "📝 GEO 답변", preset: { funnel: "consideration" as Funnel, types: ["seo" as ContentType] } },
          { label: "📋 에이전시 브리프", preset: { funnel: "conversion" as Funnel, types: ["adCopy" as ContentType, "faq" as ContentType, "image" as ContentType] } },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => applyPreset(btn.preset)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent/40 hover:border-foreground/20 transition-colors shrink-0"
          >
            {btn.label}
          </button>
        ))}

        <button
          onClick={() => applyPreset({ funnel: "conversion", types: ["adCopy", "faq", "seo", "image"], platforms: ["pmax", "metaFeed", "metaStories"] })}
          className="ml-auto text-[11px] font-bold px-4 py-1.5 rounded-lg text-white shrink-0 transition-colors"
          style={{ background: "#A50034" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FD312E")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#A50034")}
        >
          ✦ 전체 에셋 일괄 생성
        </button>
      </div>

      {/* ━━━ 3. STEP 1: GOAL + CONTENT TYPE ━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3.5">
        {/* Left: 마케팅 목표 */}
        <div className="border border-border rounded-xl p-4 bg-card space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🎯 마케팅 목표 (퍼널 단계)</p>
          <div className="flex flex-wrap gap-2">
            {FUNNELS.map((f) => {
              const isActive = funnel === f.key;
              const style = FUNNEL_STYLES[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setFunnel(f.key)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border-[1.5px] transition-all"
                  style={{
                    backgroundColor: isActive ? style.bg : "transparent",
                    borderColor: isActive ? style.border : "hsl(var(--border))",
                    color: isActive ? style.text : "hsl(var(--muted-foreground))",
                  }}
                >
                  {f.icon} {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: 콘텐츠 타입 */}
        <div className="border border-border rounded-xl p-4 bg-card space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">📐 콘텐츠 타입 (복수 선택)</p>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map((ct) => {
              const isActive = types.has(ct.key);
              return (
                <button
                  key={ct.key}
                  onClick={() => toggleType(ct.key)}
                  className="text-center p-2.5 rounded-[10px] border-[1.5px] cursor-pointer transition-all"
                  style={{
                    backgroundColor: isActive ? ct.bg : "transparent",
                    borderColor: isActive ? ct.border : "hsl(var(--border))",
                    color: isActive ? ct.text : "hsl(var(--muted-foreground))",
                  }}
                >
                  <span className="text-lg block">{ct.icon}</span>
                  <span className="text-[11px] font-semibold mt-1 block">{ct.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ━━━ 4. STEP 2: PLATFORM SELECTOR ━━━ */}
      {showPlatforms && (
        <div className="border border-border rounded-xl p-4 bg-card space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">📡 광고 포맷 선택 (복수 선택 가능)</p>
          {(() => {
            const groups = new Map<string, Platform[]>();
            for (const p of PLATFORMS) {
              if (!groups.has(p.group)) groups.set(p.group, []);
              groups.get(p.group)!.push(p);
            }
            return Array.from(groups.entries()).map(([group, items]) => (
              <div key={group} className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-medium">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((pl) => {
                    const isActive = platforms.has(pl.key);
                    return (
                      <button
                        key={pl.key}
                        onClick={() => togglePlatform(pl.key)}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all"
                        style={{
                          backgroundColor: isActive ? "#EFF6FF" : "transparent",
                          borderColor: isActive ? "#1D4ED8" : "hsl(var(--border))",
                          color: isActive ? "#1D4ED8" : "hsl(var(--muted-foreground))",
                        }}
                      >
                        {pl.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Source context */}
      <div className="flex flex-wrap gap-1.5 px-1">
        <span className="text-[10px] text-muted-foreground font-medium mr-1">데이터 소스:</span>
        {Object.entries(sources).sort(([, a], [, b]) => b - a).map(([src, cnt]) => (
          <Badge key={src} variant="secondary" className="text-[10px] font-normal">{src} {cnt.toLocaleString()}건</Badge>
        ))}
      </div>
    </div>
  );
}
