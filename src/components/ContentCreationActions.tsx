import { useState } from "react";
import { ExternalLink, Image, LayoutTemplate, Sparkles, Eye, MousePointer, ShoppingCart, RefreshCw, Copy, ArrowRight, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const AD_FUNNELS = [
  {
    key: "awareness",
    icon: <Eye className="h-4 w-4" />,
    labelKo: "인지도 제고",
    descKo: "브랜드 인지도, 도달, 노출",
    channels: ["YouTube Bumper", "Meta Stories", "Display"],
    messageCore: "감성 훅, 시각 임팩트",
  },
  {
    key: "consideration",
    icon: <MousePointer className="h-4 w-4" />,
    labelKo: "방문 유도 & 고려",
    descKo: "사이트 방문, 상세페이지 조회",
    channels: ["PMAX", "Meta Carousel", "Affiliate"],
    messageCore: "기능 증명, 리뷰 신뢰",
  },
  {
    key: "conversion",
    icon: <ShoppingCart className="h-4 w-4" />,
    labelKo: "구매 전환",
    descKo: "장바구니, 결제, 구매",
    channels: ["Search RSA", "Criteo", "LG.com"],
    messageCore: "오퍼, 긴급성, CTA",
  },
  {
    key: "retention",
    icon: <RefreshCw className="h-4 w-4" />,
    labelKo: "재구매 & 리텐션",
    descKo: "로열티, 크로스셀, 반복 구매",
    channels: ["Email CRM", "Meta", "Affiliate"],
    messageCore: "업그레이드, 커뮤니티",
  },
];

const ASSETS = [
  { thumb_bg: "linear-gradient(135deg, #1a1a18, #2d1a16)", thumb_emoji: "🖥️", badge: { text: "LG.com", bg: "#B83228", color: "#fff" }, type: "Owned Media", name: "LG.com Hero Banner", spec: "1920×600px · Desktop", export_label: "↗ Figma", export_url: "https://figma.com", design_prompt: "LG OLED Hero Banner · 1920×600px · Dark cinematic background" },
  { thumb_bg: "linear-gradient(135deg, #1a52d4, #0d3aa8)", thumb_emoji: "🎬", badge: { text: "Meta", bg: "#1a52d4", color: "#fff" }, type: "Paid Media · Vertical", name: "Meta Reels Video", spec: "9:16 · 15–30s · Hook", export_label: "↗ Canva", export_url: "https://canva.com", design_prompt: "Meta Reels 9:16 15s · UGC style" },
  { thumb_bg: "linear-gradient(135deg, #1a8a4a, #0d6034)", thumb_emoji: "📊", badge: { text: "PMax", bg: "#1a8a4a", color: "#fff" }, type: "Paid Media · Google", name: "PMax Asset Group Image", spec: "1200×628 · Lifestyle", export_label: "↗ Midjourney", export_url: "https://midjourney.com", design_prompt: "Google PMax 1200x628 · Lifestyle shot" },
  { thumb_bg: "linear-gradient(135deg, #ff9900, #e07800)", thumb_emoji: "📦", badge: { text: "Amazon", bg: "#ff9900", color: "#fff" }, type: "Retailer · Amazon", name: "Amazon A+ Hero Image", spec: "970×300 · White BG", export_label: "↗ Figma", export_url: "https://figma.com", design_prompt: "Amazon A+ 970x300 · White background" },
];

interface ContentCreationActionsProps {
  productName: string;
  displayName?: string;
}

function StepBadge({ step }: { step: number }) {
  return (
    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
      {step}
    </span>
  );
}

export function ContentCreationActions({ productName, displayName }: ContentCreationActionsProps) {
  const { t } = useLang();
  const [selectedFunnel, setSelectedFunnel] = useState("awareness");
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap(prev => ({ ...prev, [id]: true }));
    toast.success("복사됨!");
    setTimeout(() => setCopiedMap(prev => ({ ...prev, [id]: false })), 2000);
  };

  const pName = displayName || productName;
  const activeFunnel = AD_FUNNELS.find(f => f.key === selectedFunnel)!;

  return (
    <div className="space-y-4">

      {/* ═══ STEP 3: Goal Setting ═══ */}
      <div className="gradient-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
          <StepBadge step={3} />
          <h4 className="text-sm font-bold">🎯 목표 설정 (퍼널 단계)</h4>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {AD_FUNNELS.map(f => {
            const isActive = selectedFunnel === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setSelectedFunnel(f.key)}
                className={`relative p-3.5 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40 bg-card"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={isActive ? "text-primary" : "text-muted-foreground"}>{f.icon}</span>
                  <span className={`text-xs font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
                    {f.labelKo}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{f.descKo}</p>
                {isActive && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ STEP 4: Channel & Message Mapping ═══ */}
      <div className="gradient-card rounded-xl border border-primary/20 p-5">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
          <StepBadge step={4} />
          <h4 className="text-sm font-bold">📡 채널 · 메시지 매핑</h4>
          <Badge variant="outline" className="text-[10px] ml-auto border-primary/30 text-primary">{activeFunnel.labelKo}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Recommended channels */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">추천 채널</p>
            <div className="flex flex-wrap gap-1.5">
              {activeFunnel.channels.map(ch => (
                <Badge key={ch} className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                  {ch}
                </Badge>
              ))}
            </div>
          </div>
          {/* Message core */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">메시지 핵심</p>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-bold text-foreground">{activeFunnel.messageCore}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STEP 5: Content Type — Media Asset Creation ═══ */}
      <div className="gradient-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
          <StepBadge step={5} />
          <h4 className="text-sm font-bold">🎨 콘텐츠 타입 — 미디어 에셋 크리에이션</h4>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ASSETS.map((a, i) => (
            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-14 flex items-center justify-center relative" style={{ background: a.thumb_bg }}>
                <span className="text-xl">{a.thumb_emoji}</span>
                <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: a.badge.bg, color: a.badge.color }}>
                  {a.badge.text}
                </span>
              </div>
              <div className="p-3">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{a.type}</p>
                <h5 className="text-xs font-bold text-foreground mb-1">{a.name}</h5>
                <p className="text-[10px] text-muted-foreground mb-2">{a.spec}</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleCopy(`asset-main-${i}`, `${a.design_prompt} · Product: ${pName}`)}
                    className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold hover:opacity-90 transition-opacity"
                  >
                    {copiedMap[`asset-main-${i}`] ? "✅" : "📋"} 프롬프트
                  </button>
                  <button
                    onClick={() => window.open(a.export_url, "_blank")}
                    className="px-2 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-0.5"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    {a.export_label}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ STEP 6: Generate — CTA + Anita ═══ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <StepBadge step={6} />
          <h4 className="text-sm font-bold">🚀 생성 실행</h4>
        </div>

        {/* Generate Copy CTA */}
        <a
          href={`/toolkit?product=${encodeURIComponent(productName)}&funnel=${selectedFunnel}`}
          className="block w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--primary)/0.8)] text-primary-foreground text-sm font-bold text-center hover:opacity-90 transition-opacity"
        >
          ✨ {pName} — {activeFunnel.labelKo} AI 카피 생성하기
        </a>

        {/* Anita Creative Studio */}
        <a
          href="https://anita-twincrew.lovable.app/studio"
          target="_blank"
          rel="noopener noreferrer"
          className="group gradient-card rounded-xl border border-border p-4 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer block"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shrink-0 shadow-md">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-bold text-foreground">🎨 LG CreW Anita — AI Creative Studio</h4>
                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                제품 이미지 & 배너를 즉시 제작합니다. 클릭하여 이동하세요.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[10px] font-semibold">
                <Image className="h-3 w-3" /> 이미지
              </span>
              <span className="flex items-center gap-1 rounded-full bg-accent/30 text-accent-foreground px-2.5 py-1 text-[10px] font-semibold">
                <LayoutTemplate className="h-3 w-3" /> 배너
              </span>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
