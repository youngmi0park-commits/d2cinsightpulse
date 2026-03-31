import { useState } from "react";
import { ExternalLink, Image, LayoutTemplate, Sparkles, Copy } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";

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

export function ContentCreationActions({ productName, displayName }: ContentCreationActionsProps) {
  const { t } = useLang();
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap(prev => ({ ...prev, [id]: true }));
    toast.success("복사됨!");
    setTimeout(() => setCopiedMap(prev => ({ ...prev, [id]: false })), 2000);
  };

  const pName = displayName || productName;

  return (
    <div className="space-y-4">

      {/* ═══ 미디어 에셋 크리에이션 ═══ */}
      <div className="gradient-card rounded-xl border border-border p-5">
        <div className="pb-3 mb-4 border-b border-border">
          <h4 className="text-sm font-bold">🎨 미디어 에셋 크리에이션</h4>
          <p className="text-[10px] text-muted-foreground">채널별 에셋 프롬프트를 복사하여 디자인 툴에 바로 활용하세요</p>
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

      {/* ═══ LG CreW Anita ═══ */}
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
  );
}
