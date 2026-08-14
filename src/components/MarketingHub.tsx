import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FaqPanel } from "@/components/FaqPanel";
import { ContentCreationActions } from "@/components/ContentCreationActions";
import { useLang } from "@/contexts/LanguageContext";
import {
  Wrench, Copy, Eye, MousePointer, ShoppingCart, RefreshCw,
  Check, ShieldCheck, AlertTriangle, ChevronDown, ChevronRight,
  ExternalLink, Download, Sparkles, Trophy, FileText, Megaphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { GeoMessage, MarketingOutput } from "@/lib/formatMessage";
import { exportMarketingAssets } from "@/lib/exportMarketingAssets";
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

/* ── Funnel definitions ── */
const AD_FUNNELS = [
  { key: "awareness", icon: <Eye className="h-4 w-4" />, labelKo: "인지도 제고", descKo: "브랜드 인지도, 도달, 노출" },
  { key: "consideration", icon: <MousePointer className="h-4 w-4" />, labelKo: "방문 유도 & 고려", descKo: "사이트 방문, 상세페이지 조회" },
  { key: "conversion", icon: <ShoppingCart className="h-4 w-4" />, labelKo: "구매 전환", descKo: "장바구니, 결제, 구매" },
  { key: "retention", icon: <RefreshCw className="h-4 w-4" />, labelKo: "재구매 & 리텐션", descKo: "로열티, 크로스셀, 반복 구매" },
];

/* ── Full 15 channel formats with limits & funnel mapping ── */
interface ChannelDef {
  key: string;
  label: string;
  color: string;
  format: string;
  fields: { name: string; max: number }[];
  funnels: string[];
}

const ALL_CHANNELS: ChannelDef[] = [
  { key: "google_pmax", label: "Google PMAX", color: "#1a8a4a", format: "Headlines A/B + Descriptions A/B", fields: [{ name: "Headline A", max: 30 }, { name: "Headline B", max: 30 }, { name: "Description A", max: 90 }, { name: "Description B", max: 90 }], funnels: ["conversion"] },
  { key: "google_rsa", label: "Google Search RSA", color: "#1a8a4a", format: "Headlines ×5 + Descriptions ×2", fields: [{ name: "Headline", max: 30 }, { name: "Description", max: 90 }], funnels: ["consideration", "conversion"] },
  { key: "google_gdn", label: "Google Display/GDN", color: "#1a8a4a", format: "Short Headline + Long Headline + Description + CTA", fields: [{ name: "Short Headline", max: 25 }, { name: "Long Headline", max: 90 }, { name: "Description", max: 90 }, { name: "CTA", max: 15 }], funnels: ["awareness"] },
  { key: "meta_feed", label: "Meta Feed", color: "#1a52d4", format: "Primary Text(A/B) + Headline + Description + CTA", fields: [{ name: "Primary Text A", max: 125 }, { name: "Primary Text B", max: 125 }, { name: "Headline", max: 27 }, { name: "Description", max: 27 }, { name: "CTA", max: 20 }], funnels: ["consideration", "conversion"] },
  { key: "meta_stories", label: "Meta Stories/Reels", color: "#1a52d4", format: "Hook + Caption + CTA", fields: [{ name: "Caption", max: 125 }, { name: "CTA", max: 20 }], funnels: ["awareness", "conversion"] },
  { key: "meta_carousel", label: "Meta Carousel", color: "#1a52d4", format: "Card별 Headline + Body + CTA", fields: [{ name: "Headline", max: 40 }, { name: "Body", max: 125 }, { name: "CTA", max: 20 }], funnels: ["consideration", "conversion"] },
  { key: "criteo_retargeting", label: "Criteo Retargeting", color: "#F57C00", format: "Headline + Description + CTA", fields: [{ name: "Headline", max: 25 }, { name: "Description", max: 38 }, { name: "CTA", max: 15 }], funnels: ["conversion", "retention"] },
  { key: "criteo_sponsored", label: "Criteo Sponsored", color: "#F57C00", format: "Headline + Description + CTA", fields: [{ name: "Headline", max: 25 }, { name: "Description", max: 38 }, { name: "CTA", max: 15 }], funnels: ["conversion"] },
  { key: "youtube_bumper", label: "YouTube Bumper 6s", color: "#c4302b", format: "Script + Visual Note", fields: [{ name: "Script", max: 30 }, { name: "Visual Note", max: 90 }], funnels: ["awareness"] },
  { key: "youtube_trueview", label: "YouTube TrueView", color: "#c4302b", format: "Hook(5s) + Body(30s) + CTA Overlay", fields: [{ name: "Hook", max: 60 }, { name: "Body", max: 200 }, { name: "CTA", max: 20 }], funnels: ["consideration", "conversion"] },
  { key: "lgcom_hero", label: "LG.com Hero Banner", color: "#A50034", format: "Eyebrow + Headline + Subheadline + CTA", fields: [{ name: "Eyebrow", max: 40 }, { name: "Headline", max: 50 }, { name: "Subheadline", max: 80 }, { name: "CTA", max: 35 }], funnels: ["awareness", "consideration"] },
  { key: "lgcom_pdp", label: "LG.com PDP 배너", color: "#A50034", format: "Headline + Body + CTA", fields: [{ name: "Headline", max: 50 }, { name: "Body", max: 80 }, { name: "CTA", max: 35 }], funnels: ["conversion"] },
  { key: "lgcom_email", label: "LG.com Email/CRM", color: "#A50034", format: "Subject + Body + CTA", fields: [{ name: "Subject", max: 60 }, { name: "Body", max: 200 }, { name: "CTA", max: 25 }], funnels: ["retention"] },
  { key: "affiliate_reviewer", label: "Affiliate 리뷰어 브리프", color: "#6B21A8", format: "Brief Headline + Key Points ×3 + CTA 제안 + Long Form", fields: [{ name: "Headline", max: 60 }, { name: "Key Point", max: 80 }, { name: "CTA", max: 25 }, { name: "Brief (Long)", max: 1000 }], funnels: ["consideration", "conversion"] },
  { key: "affiliate_publisher", label: "Affiliate 퍼블리셔 배너", color: "#6B21A8", format: "Headline + Description + CTA", fields: [{ name: "Headline", max: 40 }, { name: "Description", max: 90 }, { name: "CTA", max: 20 }], funnels: ["conversion"] },
];

/* ── FAQ purposes ── */
const FAQ_PURPOSES = [
  { key: "pdp", label: "PDP", desc: "상품 상세 페이지 · 구매 전 의문 해소 · 전환율 직결", icon: "🛒" },
  { key: "geo", label: "GEO", desc: "ChatGPT·Gemini·Perplexity 최적화 · AI 검색 Featured Answer 형식 · 200자 이내", icon: "🤖" },
  { key: "seo", label: "SEO", desc: "구글 검색 FAQ 스키마 · People Also Ask 대응 · 롱테일 키워드 포함", icon: "🔍" },
  { key: "crm", label: "CRM/CS", desc: "고객 응대·이메일 · 부정 이슈 선제 대응 · 이탈 방지", icon: "📞" },
];

/* ── SEO/GEO scripts ── */
const SEO_GEO_TYPES = [
  { key: "seo_brief", label: "SEO 페이지 브리프", desc: "타겟 키워드 + SERP 미리보기(Meta Title·Description) + H태그 아웃라인(H1·H2·H3)", usage: "콘텐츠 팀 / 에이전시 전달용", icon: "📋" },
  { key: "geo_script", label: "GEO 답변 스크립트", desc: "AI 검색 Featured Answer 최적화 스크립트 (200자 이내, 수치·모델명 포함)", usage: "ChatGPT·Gemini·Perplexity 노출 최적화", icon: "🤖" },
];

/* ── Image asset specs ── */
const IMAGE_ASSETS = [
  { size: "1920×600", platform: "LG.com Hero Banner", prompt: "크리에이티브 방향 텍스트 (배경·카피 오버레이·컬러)", tool: "LG Twin Crew" },
  { size: "1080×1080", platform: "Meta Feed", prompt: "Midjourney /imagine 문법", tool: "Midjourney · Firefly" },
  { size: "1080×1920", platform: "Meta Stories/Reels", prompt: "Midjourney /imagine 문법", tool: "Midjourney · Firefly" },
  { size: "1280×720", platform: "YouTube Thumbnail", prompt: "Midjourney /imagine 문법", tool: "Midjourney · Firefly" },
  { size: "300×250", platform: "Google Display/GDN", prompt: "Midjourney /imagine 문법", tool: "LG Twin Crew" },
  { size: "728×90", platform: "Leaderboard Banner", prompt: "크리에이티브 방향 텍스트", tool: "LG Twin Crew" },
  { size: "320×50", platform: "Mobile Banner", prompt: "크리에이티브 방향 텍스트", tool: "LG Twin Crew" },
];

/* ── AI tool prompts ── */
const AI_TOOLS = [
  { key: "chatgpt", label: "ChatGPT", desc: "광고 카피 · FAQ 대량 생성", url: "https://chat.openai.com", icon: "💬" },
  { key: "claude", label: "Claude", desc: "장문 SEO 콘텐츠 · 에이전시 브리프", url: "https://claude.ai", icon: "🧠" },
  { key: "gemini", label: "Gemini", desc: "GEO 스크립트 · AI 검색 최적화", url: "https://gemini.google.com", icon: "✨" },
  { key: "midjourney", label: "Midjourney", desc: "제품 이미지 · 라이프스타일 이미지", url: "https://midjourney.com", icon: "🎨" },
  { key: "perplexity", label: "Perplexity", desc: "AI 검색 Featured Answer 테스트", url: "https://perplexity.ai", icon: "🔎" },
  { key: "firefly", label: "Adobe Firefly", desc: "상업용 안전 이미지 (저작권 무결)", url: "https://firefly.adobe.com", icon: "🔥" },
  { key: "suno", label: "Suno", desc: "광고 BGM · 징글 생성", url: "https://suno.com", icon: "🎵" },
  { key: "heygen", label: "HeyGen", desc: "AI 아바타 광고 영상 스크립트", url: "https://heygen.com", icon: "🎬" },
];

/* ── Funnel VOC insight generator ── */
interface FunnelVocInsight {
  message: string;
  sourceQuotes: string[];
  keywords: string[];
  strategy: string;
}

function buildFunnelInsight(
  funnel: string,
  sentiment: SentimentResult,
  reviews: { text: string; sentiment?: string; source?: string }[],
  pName: string,
): FunnelVocInsight {
  const posKw = sentiment.keywords.positive || [];
  const negKw = sentiment.keywords.negative || [];
  const scenes = sentiment.usageScenes || [];
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const posPct = total ? Math.round((sentiment.positive / total) * 100) : 0;

  // Extract real review snippets (non-privacy) as evidence
  const openReviews = reviews.filter(r => !r.source?.startsWith("lge_com"));
  const posReviews = openReviews.filter(r => r.sentiment === "positive");
  const negReviews = openReviews.filter(r => r.sentiment === "negative");

  const pickQuotes = (arr: typeof reviews, n: number) =>
    arr.slice(0, n).map(r => {
      const t = r.text.length > 100 ? r.text.slice(0, 97) + "…" : r.text;
      return t;
    });

  // 핵심 메시지 / 실행 전략은 국문, 원본 리뷰(sourceQuotes)는 영문 원본 유지
  switch (funnel) {
    case "awareness":
      return {
        message: `"${posKw[0] || "강점"}" 중심의 메시지로 첫인상에서 신뢰 확보 — 긍정 리뷰 ${posPct}% 기반`,
        sourceQuotes: pickQuotes(posReviews, 2),
        keywords: posKw.slice(0, 4),
        strategy: `핵심 강점(${posKw.slice(0, 2).join(", ") || "주요 베네핏"})을 YouTube Bumper·GDN 등 짧은 인지 채널에 반복 노출하여 브랜드 연상을 강화합니다.`,
      };
    case "consideration":
      return {
        message: `실사용자 만족도 ${posPct}% — "${posKw[0] || "성능"}"과 "${scenes[0] || "일상"}" 사용 장면을 결합해 PDP 탐색을 유도`,
        sourceQuotes: pickQuotes(posReviews, 2),
        keywords: [...posKw.slice(0, 2), ...(scenes.length ? [scenes[0]] : [])],
        strategy: negKw[0]
          ? `"${negKw[0]}" 우려를 비교 콘텐츠와 리뷰 기반 소셜 프루프로 선제 해소하여 PDP 체류 시간을 늘립니다.`
          : `리뷰 기반 소셜 프루프와 "${scenes[0] || "일상"}" 사용 장면 영상을 활용해 PDP 방문을 유도합니다.`,
      };
    case "conversion":
      return {
        message: negKw[0]
          ? `"${negKw[0]}" 우려 해소 + "${posKw[0] || "만족"}" 강조 메시지로 구매 결정을 지원`
          : `"${posKw[0] || "품질"}" 검증 완료 — 총 ${total}건 리뷰가 구매 확신을 제공`,
        sourceQuotes: [...pickQuotes(posReviews, 1), ...pickQuotes(negReviews, 1)],
        keywords: [...posKw.slice(0, 2), ...(negKw[0] ? [negKw[0]] : [])],
        strategy: `실사용자 만족 데이터(긍정 ${posPct}%)와 ${negKw[0] ? `"${negKw[0]}" 해소 메시지` : "핵심 강점 재강조"}를 PDP·리타게팅 배너에 배치해 장바구니 이탈을 방지합니다.`,
      };
    case "retention":
      return {
        message: `기존 고객의 "${posKw[0] || "만족"}" 경험을 활용한 크로스셀·업셀 메시지 전개`,
        sourceQuotes: pickQuotes(posReviews.length ? posReviews : openReviews, 2),
        keywords: posKw.slice(0, 3),
        strategy: `높은 만족도(${posPct}%)를 활용해 추천 프로그램과 동일 카테고리 신제품 이메일 CRM 캠페인을 운영합니다.`,
      };
    default:
      return { message: "", sourceQuotes: [], keywords: [], strategy: "" };
  }
}

/* ── Helpers ── */
function cleanCopy(text: string): string {
  return text
    .replace(/\b(best|#1|unprecedented|most reliable|top-rated|number one|world's first|unmatched|ultimate)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

/**
 * 광고 가이드 글자수에 맞춰 "기획된" 카피를 선택.
 * 단순 자르기(truncate)가 아니라, 사전 작성된 다중 카피 후보 중
 * max 한도 내에서 가장 풍부한 표현을 고른다.
 * 모든 후보가 한도를 초과하면 단어 경계에서 안전하게 줄인다.
 */
function pickBestFit(candidates: string[], max: number): string {
  const cleaned = candidates.map(cleanCopy).filter(Boolean);
  // 한도 내 후보 중 가장 길고 풍부한 카피 선택 (정보량 ↑)
  const fits = cleaned.filter((c) => c.length <= max).sort((a, b) => b.length - a.length);
  if (fits.length > 0) return fits[0];
  // 한도 초과 시: 가장 짧은 후보를 단어 경계에서 자연스럽게 다듬음
  const shortest = cleaned.sort((a, b) => a.length - b.length)[0] || "";
  if (shortest.length <= max) return shortest;
  const sliced = shortest.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  const safe = lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return safe.replace(/[,.\-:;]+$/, "").trim();
}

function quickComply(text: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const lower = text.toLowerCase();
  const superlatives = ["best", "#1", "unprecedented", "most reliable", "top-rated", "number one", "world's first", "unmatched", "ultimate"];
  for (const s of superlatives) if (lower.includes(s)) issues.push(`"${s}" removed`);
  return { ok: issues.length === 0, issues };
}

function SectionHeader({ title, subtitle, collapsible, isOpen }: { title: string; subtitle: string; collapsible?: boolean; isOpen?: boolean }) {
  return (
    <div className={`pb-3 mb-4 border-b border-border ${collapsible ? "flex items-center justify-between cursor-pointer hover:bg-muted/30 rounded-lg -mx-2 px-2 py-2 transition-colors" : ""}`}>
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      {collapsible && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-primary font-semibold">{isOpen ? "접기" : "펼치기"}</span>
          {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
        </div>
      )}
    </div>
  );
}

/* ── Derive a generic category noun (no SKU/model) ── */
function deriveCategoryNoun(pName: string): string {
  const s = (pName || "").toLowerCase();
  if (/oled|qned|nanocell|uhd|smart\s*tv|\btv\b/.test(s)) return "OLED TV";
  if (/soundbar|sound\s*bar/.test(s)) return "Soundbar";
  if (/xboom|speaker|bluetooth/.test(s)) return "Speaker";
  if (/gram|laptop|ultrapc|notebook/.test(s)) return "Laptop";
  if (/monitor|ultragear|ultrafine|ultrawide/.test(s)) return "Monitor";
  if (/refriger|fridge|instaview/.test(s)) return "Refrigerator";
  if (/washer|washing/.test(s)) return "Washer";
  if (/dryer/.test(s)) return "Dryer";
  if (/dishwash|quadwash/.test(s)) return "Dishwasher";
  if (/vacuum|cordzero/.test(s)) return "Vacuum";
  if (/air\s*purifi|puricare/.test(s)) return "Air Purifier";
  if (/air\s*condition|artcool|\bac\b/.test(s)) return "Air Conditioner";
  if (/range|oven/.test(s)) return "Oven";
  if (/stanbyme/.test(s)) return "Lifestyle Screen";
  if (/projector|cinebeam/.test(s)) return "Projector";
  return "Product";
}

/**
 * 카테고리/기능형 키워드(예: "Wash Quality", "Cleaning Performance", "Picture Quality")를
 * 형용사 중심 베네핏 표현(예: "Spotless", "Effortless", "Brilliant")으로 변환.
 * Short Headline 등 짧은 광고 헤드라인에 사용.
 */
function toAdjectiveBenefit(keyword: string): string {
  const k = (keyword || "").toLowerCase().trim();
  if (!k) return "Brilliant";
  const map: Array<[RegExp, string]> = [
    [/wash|laundry|clean(ing)?\s*(quality|performance)?|stain|detergent/, "Spotless"],
    [/dry(ing|er)?|wrinkle/, "Effortless"],
    [/dish|sanitiz|hygien/, "Sparkling"],
    [/vacuum|suction|dust|pet\s*hair/, "Powerful"],
    [/cool|fresh|fridge|refriger|preserv/, "Fresh"],
    [/quiet|silent|noise/, "Whisper-Quiet"],
    [/picture|display|color|hdr|contrast|black/, "Brilliant"],
    [/sound|audio|bass|dolby|atmos/, "Immersive"],
    [/bright|backlight|luminance/, "Radiant"],
    [/smart|ai|thinq|automat/, "Smarter"],
    [/energy|efficien|saving|eco/, "Efficient"],
    [/fast|speed|quick|rapid/, "Lightning-Fast"],
    [/durab|reliab|sturdy|build|long\s*last/, "Built to Last"],
    [/design|sleek|slim|minimal|aesthet|premium/, "Effortlessly Elegant"],
    [/space|capacit|large|big/, "Roomy"],
    [/install|setup|easy|simple|intuitive/, "Effortless"],
    [/gam(e|ing)|refresh|response|latency/, "Razor-Sharp"],
    [/portab|compact|light(weight)?/, "Featherlight"],
    [/comfort|cozy|soft/, "Wonderfully Cozy"],
    [/perform|power|strength/, "Powerful"],
    [/quality|reliab|trust/, "Dependable"],
  ];
  for (const [re, adj] of map) if (re.test(k)) return adj;
  return "Brilliant";
}

/* ── Generate channel copy (NO product/SKU mentions in ad surfaces) ── */
function generateCopy(channel: ChannelDef, pName: string, sentiment: SentimentResult) {
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const s2 = sentiment.keywords.positive?.[1] || "performance";
  const pain = sentiment.keywords.negative?.[0] || "";
  const scene = sentiment.usageScenes?.[0] || "living room";
  // 형용사 중심 베네핏 (Short Headline용 — "어떤 점이 좋은지" 강조)
  const adj1 = toAdjectiveBenefit(s1);
  const adj2 = toAdjectiveBenefit(s2);
  // Generic category noun replaces SKU/model in all ad-facing fields
  const noun = deriveCategoryNoun(pName);
  // Owned channels (LG.com, CRM email) may keep brand context — but still no model code
  const ownedChannel = channel.key.startsWith("lgcom_") || channel.key === "lgcom_email";

  const fieldValues: Record<string, string> = {};
  for (const f of channel.fields) {
    // 각 필드별 다중 카피 후보 — 가장 풍부하면서 한도 내인 표현이 자동 선택됨
    let candidates: string[] = [];
    switch (f.name) {
      case "Short Headline":
        // 카테고리/기능명(Wash Quality 등) 대신 형용사 중심 베네핏만 노출
        candidates = [
          `${adj1}. ${adj2}. Yours.`,
          `${adj1} & ${adj2}`,
          `So ${adj1}, So Smart`,
          `Truly ${adj1}`,
          `${adj1} ${noun}`,
          adj1,
        ];
        break;
      case "Headline A":
        candidates = [`${adj1} & ${adj2}`, `${capitalize(s1)} & ${capitalize(s2)}`];
        break;
      case "Headline B":
        candidates = [pain ? `Solves ${pain}` : `${adj1} ${noun}`, `True ${capitalize(s1)}`];
        break;
      case "Headline":
        candidates = ownedChannel ? [
          `${capitalize(s1)} You Can Feel Every Day`,
          `${capitalize(s1)} You Can Feel`,
          `Designed Around ${capitalize(s1)}`,
          `${capitalize(s1)}, Made Personal`,
          `${capitalize(s1)}, Refined`,
        ] : [
          `Where ${capitalize(s1)} Meets ${capitalize(s2)}`,
          `${capitalize(s1)} & ${capitalize(s2)}, Together`,
          `${capitalize(s1)} Meets ${capitalize(s2)}`,
          `${capitalize(s1)} + ${capitalize(s2)}`,
          `True ${capitalize(s1)}`,
        ];
        break;
      case "Long Headline":
        candidates = [
          `Experience ${s1} and ${s2} in your ${scene} — a new everyday standard.`,
          `Bring ${s1} and ${s2} into your ${scene}, every single day.`,
          `Your ${scene}, upgraded with ${s1} and ${s2}.`,
          `${capitalize(s1)} and ${s2}, made for your ${scene}.`,
          `${capitalize(s1)} & ${s2} for your ${scene}.`,
        ];
        break;
      case "Description A":
        candidates = pain ? [`Concerned about ${pain}? Owners highlight ${s1} and ${s2}.`] : [`Praised for outstanding ${s1} and reliable ${s2}.`];
        break;
      case "Description B":
        candidates = [`Experience ${s1} and ${s2} in your ${scene} every single day.`, `Your ${scene}, upgraded with ${s1} and ${s2}.`];
        break;
      case "Primary Text A":
        candidates = pain ? [
          `Concerned about ${pain}? Real users praise the ${s1} and ${s2} of the ${noun} — see why.`
        ] : [
          `Praised for outstanding ${s1} and reliable ${s2} — hear from real ${noun} owners.`
        ];
        break;
      case "Primary Text B":
        candidates = [
          `Your ${scene}, upgraded with ${s1} and ${s2}. Discover the difference the ${noun} makes.`
        ];
        break;
      case "Description": case "Body": case "Primary Text":
        candidates = pain ? [
          `Worried about ${pain}? Real users praise the ${s1} and ${s2} — see why.`,
          `Concerned about ${pain}? Owners highlight ${s1} and ${s2}.`,
          `${capitalize(s1)} that solves ${pain}. Loved by real owners.`,
          `Real owners praise the ${s1}. ${capitalize(s2)} included.`,
          `Praised for ${s1} and ${s2}.`,
        ] : [
          `Praised for outstanding ${s1} and reliable ${s2} — hear from real owners.`,
          `Owners highlight the ${s1} and ${s2} they use every day.`,
          `${capitalize(s1)} and ${s2}, praised by real owners.`,
          `Loved for ${s1} and ${s2}.`,
          `${capitalize(s1)}. ${capitalize(s2)}. Proven.`,
        ];
        break;
      case "CTA":
        candidates = ["Shop Now & Save", "Discover More", "Shop Now", "Learn More", "Buy Now", "Shop"];
        break;
      case "Eyebrow":
        candidates = ["Just Arrived — Limited Stock", "New Arrival", "New", "Now Available"];
        break;
      case "Subheadline":
        candidates = [
          `${capitalize(s1)} and ${s2} — praised by real owners worldwide.`,
          `${capitalize(s1)} and ${s2}, praised by real owners.`,
          `${capitalize(s1)} & ${s2}, owner-approved.`,
          `Praised for ${s1} and ${s2}.`,
        ];
        break;
      case "Subject":
        candidates = [
          `Your Next ${noun}: An Exclusive Offer Inside`,
          `A Smarter ${noun} — Just for You`,
          `Inside: Your ${noun} Upgrade`,
          `Your ${noun} Offer`,
        ];
        break;
      case "Caption":
        candidates = [
          `Bring ${s1} into your ${scene}. Real owners love the ${s2} every single day. ✨`,
          `${capitalize(s1)} in your ${scene}. The ${s2} owners love.`,
          `Make your ${scene} feel new — ${s1} & ${s2}.`,
          `${capitalize(s1)} for your ${scene}.`,
        ];
        break;
      case "Script":
        candidates = [
          `${capitalize(s1)}. In every ${scene}.`,
          `${capitalize(s1)}, every day.`,
          `Feel the ${s1}.`,
          capitalize(s1),
        ];
        break;
      case "Visual Note":
        candidates = [
          `Lifestyle ${scene} → close-up product detail → benefit overlay (${s1}) → CTA card`,
          `${capitalize(scene)} scene → ${s1} overlay → CTA`,
          `${capitalize(scene)} → ${s1} → CTA`,
        ];
        break;
      case "Hook":
        candidates = pain ? [
          `What if ${pain} wasn't an issue anymore?`,
          `Tired of ${pain}? Watch this.`,
          `End ${pain}, today.`,
        ] : [
          `Imagine ${s1} in your ${scene} — every single day.`,
          `Imagine ${s1} in your ${scene}.`,
          `Picture ${s1} at home.`,
        ];
        break;
      case "Brief (Long)":
        candidates = [
          `## Marketing Brief: ${pName}\n\n**Goal**: Highlight ${s1} and ${s2} in a ${scene} context.\n\n**Context**: Customer sentiment is generally positive towards ${s1}. ${pain ? `However, some users expressed concern about ${pain}. Please frame ${s1} as a solution.` : `It's praised highly in reviews.`}\n\n**Do**: Ensure you mention the product in daily use. Be honest.\n**Don't**: Use unsubstantiated claims or emojis. No direct competitor comparisons.\n\n**Hashtags**: #${noun.replace(/\\s+/g, "")} #Review #Ad`
        ];
        break;
      case "Key Point":
        candidates = [
          `✓ ${capitalize(s1)}  ✓ ${capitalize(s2)}  ✓ Trusted by owners`,
          `✓ ${capitalize(s1)} ✓ ${capitalize(s2)} ✓ Owner-loved`,
          `✓ ${capitalize(s1)} ✓ ${capitalize(s2)}`,
        ];
        break;
      default:
        candidates = [`${capitalize(s1)} & ${capitalize(s2)}`, `${capitalize(s1)}`];
    }
    // 가이드 글자수 한도 내에서 가장 풍부한 표현을 선택 (단순 자르기 X)
    fieldValues[f.name] = pickBestFit(candidates, f.max);
  }

  const fullText = Object.entries(fieldValues).map(([k, v]) => `${k}: ${v}`).join("\n");
  const compliance = quickComply(fullText);
  return { fieldValues, compliance, fullText: `[${channel.label}]\n${fullText}` };
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── PMAX A/B/C variant generator ──
 * Google PMAX 규칙: Headline ≤30자, Long Headline ≤90자, Description ≤90자
 * 3가지 앵글로 자동 변형: A) 베네핏 강조  B) 우려/Pain 해소  C) 라이프스타일/장면
 */
export interface PmaxVariant {
  id: "A" | "B" | "C";
  angle: string;
  angleEn: string;
  rationale: string;
  headlines: string[];        // up to 5, each ≤30
  longHeadline: string;       // ≤90
  descriptions: string[];     // up to 2, each ≤90
  compliance: { ok: boolean; issues: string[] };
  score: number;              // 0-100 (풍부도+규칙준수+다양성)
}

function buildPmaxVariants(pName: string, sentiment: SentimentResult): PmaxVariant[] {
  const pos = sentiment.keywords.positive || [];
  const neg = sentiment.keywords.negative || [];
  const scenes = sentiment.usageScenes || [];
  const s1 = pos[0] || "quality";
  const s2 = pos[1] || "performance";
  const s3 = pos[2] || "design";
  const pain = neg[0] || "";
  const scene = scenes[0] || "living room";
  const noun = deriveCategoryNoun(pName);
  const adj1 = toAdjectiveBenefit(s1);
  const adj2 = toAdjectiveBenefit(s2);
  const adj3 = toAdjectiveBenefit(s3);

  // Variant A — Benefit-led (형용사 베네핏 중심)
  const A: PmaxVariant = {
    id: "A",
    angle: "베네핏 강조형",
    angleEn: "Benefit-Led",
    rationale: `긍정 키워드 Top3(${pos.slice(0, 3).join(", ") || "강점"})를 형용사 베네핏으로 환산해 인지·전환 동시 공략`,
    headlines: [
      pickBestFit([`${adj1} ${noun}`, `${adj1} & ${adj2}`, adj1], 30),
      pickBestFit([`${adj1}. ${adj2}. Yours.`, `${adj1} + ${adj2}`], 30),
      pickBestFit([`So ${adj1}, So Smart`, `Truly ${adj1}`], 30),
      pickBestFit([`${adj3} ${noun}`, `${adj3} Design`, adj3], 30),
      pickBestFit([`${capitalize(s1)} You Feel`, `Real ${capitalize(s1)}`, capitalize(s1)], 30),
    ],
    longHeadline: pickBestFit([
      `Experience ${s1} and ${s2} every day — owner-praised ${noun} for your ${scene}.`,
      `${capitalize(s1)} and ${s2}, made for your ${scene}.`,
    ], 90),
    descriptions: [
      pickBestFit([
        `Praised for outstanding ${s1} and reliable ${s2} — hear from real owners.`,
        `Loved for ${s1} and ${s2} by real ${noun} owners.`,
      ], 90),
      pickBestFit([
        `Bring ${s1} into your ${scene}, every single day.`,
        `Your ${scene}, upgraded with ${s1} and ${s2}.`,
      ], 90),
    ],
    compliance: { ok: true, issues: [] },
    score: 0,
  };

  // Variant B — Pain-solver (우려/문제 해소)
  const painText = pain || "everyday hassle";
  const B: PmaxVariant = {
    id: "B",
    angle: pain ? "Pain 해소형" : "기대 충족형",
    angleEn: pain ? "Pain-Solver" : "Expectation-Match",
    rationale: pain
      ? `부정 키워드 "${pain}"을 선제 해소 메시지로 전환 — 구매 망설임 단계 직격`
      : `리뷰에서 도출된 기대치를 충족 메시지로 전환 — 신뢰 구축에 강점`,
    headlines: [
      pickBestFit([pain ? `Solves ${pain}` : `True ${capitalize(s1)}`, `End ${painText}`], 30),
      pickBestFit([`${capitalize(s1)} that Lasts`, `Built for ${capitalize(s1)}`], 30),
      pickBestFit([pain ? `No More ${capitalize(pain)}` : `${adj1} ${noun}`, `Worry-Free ${noun}`], 30),
      pickBestFit([`Owner-Approved ${noun}`, `Trusted ${noun}`, `Proven ${noun}`], 30),
      pickBestFit([`Real Owners. Real ${capitalize(s1)}.`, `Real ${capitalize(s1)}`], 30),
    ],
    longHeadline: pickBestFit([
      pain
        ? `Worried about ${pain}? Real owners praise the ${s1} and ${s2} of this ${noun}.`
        : `Praised by real owners for ${s1} and ${s2} — see why this ${noun} delivers.`,
    ], 90),
    descriptions: [
      pickBestFit([
        pain
          ? `Concerned about ${pain}? Owners highlight the ${s1} and ${s2} they rely on.`
          : `Owners highlight the ${s1} and ${s2} they use every day.`,
      ], 90),
      pickBestFit([
        `${capitalize(s1)}. ${capitalize(s2)}. Proven by real ${noun} owners.`,
      ], 90),
    ],
    compliance: { ok: true, issues: [] },
    score: 0,
  };

  // Variant C — Lifestyle/Scene (사용 장면 감성)
  const C: PmaxVariant = {
    id: "C",
    angle: "라이프스타일형",
    angleEn: "Lifestyle-Scene",
    rationale: `사용 장면(${scene})과 감성 베네핏을 결합 — 인지·고려 단계 도달률 극대화`,
    headlines: [
      pickBestFit([`Your ${capitalize(scene)}, Upgraded`, `For Your ${capitalize(scene)}`], 30),
      pickBestFit([`${adj1} in Your ${capitalize(scene)}`, `${capitalize(scene)} Reimagined`], 30),
      pickBestFit([`Made for ${capitalize(scene)}`, `Built for ${capitalize(scene)}`], 30),
      pickBestFit([`${adj2} Every Day`, `Daily ${adj2}`, adj2], 30),
      pickBestFit([`Live ${capitalize(s1)}`, `Feel the ${capitalize(s1)}`], 30),
    ],
    longHeadline: pickBestFit([
      `Bring ${s1} and ${s2} into your ${scene} — a new everyday standard.`,
      `Your ${scene}, redefined by ${s1} and ${s2}.`,
    ], 90),
    descriptions: [
      pickBestFit([
        `Make your ${scene} feel new — ${s1} and ${s2} owners love every day.`,
        `${capitalize(s1)} for your ${scene}. Loved by real owners.`,
      ], 90),
      pickBestFit([
        `From morning to night — ${s1} and ${s2} in your ${scene}.`,
      ], 90),
    ],
    compliance: { ok: true, issues: [] },
    score: 0,
  };

  // Score: compliance + 한도 준수율 + 다양성(unique 단어) + 길이 충실도
  const scoreVariant = (v: PmaxVariant): PmaxVariant => {
    const allText = [...v.headlines, v.longHeadline, ...v.descriptions].join(" | ");
    v.compliance = quickComply(allText);
    const headlineFit = v.headlines.filter(h => h && h.length <= 30).length / 5;
    const descFit = v.descriptions.filter(d => d && d.length <= 90).length / v.descriptions.length;
    const longFit = v.longHeadline.length <= 90 ? 1 : 0;
    // 다양성: 헤드라인 unique token 비율
    const tokens = v.headlines.join(" ").toLowerCase().split(/\W+/).filter(Boolean);
    const uniq = new Set(tokens).size;
    const diversity = tokens.length ? Math.min(1, uniq / tokens.length) : 0;
    // 길이 충실도(평균 헤드라인 길이/30)
    const avgLen = v.headlines.reduce((a, h) => a + h.length, 0) / v.headlines.length;
    const richness = Math.min(1, avgLen / 24);
    const compliancePass = v.compliance.ok ? 1 : 0.7;
    v.score = Math.round(
      ((headlineFit * 0.25) + (descFit * 0.15) + (longFit * 0.10) + (diversity * 0.20) + (richness * 0.20) + (compliancePass * 0.10)) * 100
    );
    return v;
  };

  return [A, B, C].map(scoreVariant);
}

/* ── Meta Primary Text A/B/C variant generator ──
 * Meta Feed/Stories 규칙: Primary Text ≤125자, Headline ≤27자, CTA ≤20자
 * 3가지 톤 변형: A) Hook/Question  B) Social Proof  C) Story/Lifestyle
 */
export interface MetaVariant {
  id: "A" | "B" | "C";
  angle: string;
  angleEn: string;
  rationale: string;
  primaryText: string;       // ≤125
  headline: string;          // ≤27
  description: string;       // ≤27
  cta: string;               // ≤20
  hashtags: string[];
  compliance: { ok: boolean; issues: string[] };
  score: number;
}

function buildMetaVariants(pName: string, sentiment: SentimentResult): MetaVariant[] {
  const pos = sentiment.keywords.positive || [];
  const neg = sentiment.keywords.negative || [];
  const scenes = sentiment.usageScenes || [];
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const posPct = total ? Math.round((sentiment.positive / total) * 100) : 0;
  const s1 = pos[0] || "quality";
  const s2 = pos[1] || "performance";
  const pain = neg[0] || "";
  const scene = scenes[0] || "everyday life";
  const noun = deriveCategoryNoun(pName);
  const adj1 = toAdjectiveBenefit(s1);
  const tag = noun.replace(/\s+/g, "");

  // A — Hook/Question (관심 환기)
  const A: MetaVariant = {
    id: "A",
    angle: "후크 질문형",
    angleEn: "Hook/Question",
    rationale: pain
      ? `"${pain}" 우려를 질문으로 환기 → 관심 유발 후 베네핏 해결 제시 (스크롤 정지율 ↑)`
      : `궁금증을 자극하는 질문으로 시작 → 베네핏 ${s1} 자연스럽게 노출`,
    primaryText: pickBestFit([
      pain
        ? `Tired of ${pain}? Real owners say the ${s1} of this ${noun} changed everything. See why ${posPct}% of reviews are positive. ✨`
        : `What if your ${scene} felt brand new? Real owners praise the ${s1} & ${s2} of this ${noun}. ${posPct}% love it. ✨`,
      pain
        ? `Worried about ${pain}? Owners highlight the ${s1} they trust every day.`
        : `Looking for ${adj1} ${noun}? Owners praise the ${s1} every day.`,
    ], 125),
    headline: pickBestFit([`${adj1} ${noun}`, `Truly ${adj1}`, adj1], 27),
    description: pickBestFit([`Owner-Approved`, `Loved by Owners`, `Real Reviews`], 27),
    cta: pickBestFit(["Shop Now", "Learn More", "Discover"], 20),
    hashtags: [`#LG${tag}`, `#${capitalize(s1).replace(/\s+/g, "")}`, "#RealReviews"],
    compliance: { ok: true, issues: [] },
    score: 0,
  };

  // B — Social Proof (수치 + 리뷰 인용 톤)
  const B: MetaVariant = {
    id: "B",
    angle: "소셜 프루프형",
    angleEn: "Social Proof",
    rationale: `리뷰 ${total}건 중 긍정 ${posPct}% 데이터를 전면 노출 → 신뢰·전환 동시 강화`,
    primaryText: pickBestFit([
      `${posPct}% of ${total}+ reviews praise the ${s1} and ${s2}. Hear it from real ${noun} owners. ⭐`,
      `Real owners. Real ${s1}. ${posPct}% positive across ${total}+ reviews — see why this ${noun} stands out.`,
      `Owners highlight ${s1} and ${s2}. Join ${total}+ reviewers who trust this ${noun}.`,
    ], 125),
    headline: pickBestFit([`${posPct}% Owner-Loved`, `Owner-Approved`, `Owner-Loved`], 27),
    description: pickBestFit([`${total}+ Real Reviews`, `Real Owner Praise`, `Owner Praised`], 27),
    cta: pickBestFit(["See Reviews", "Shop Now", "Learn More"], 20),
    hashtags: [`#LG${tag}`, "#RealReviews", "#OwnerLoved"],
    compliance: { ok: true, issues: [] },
    score: 0,
  };

  // C — Story/Lifestyle (장면 기반 감성)
  const C: MetaVariant = {
    id: "C",
    angle: "스토리 라이프스타일형",
    angleEn: "Story/Lifestyle",
    rationale: `사용 장면(${scene}) 중심의 감성 스토리텔링 → 인지·고려 단계 도달률 극대화`,
    primaryText: pickBestFit([
      `From morning to night in your ${scene} — ${s1} and ${s2} you can feel. That's the ${noun} owners love. ✨`,
      `Your ${scene}, upgraded. ${capitalize(s1)} and ${s2} that real owners praise every day.`,
      `Bring ${s1} into your ${scene}. Loved by real ${noun} owners.`,
    ], 125),
    headline: pickBestFit([`For Your ${capitalize(scene)}`, `${capitalize(scene)} Upgraded`, `Made for ${capitalize(scene)}`], 27),
    description: pickBestFit([`Loved Every Day`, `Daily ${capitalize(s1)}`, capitalize(s1)], 27),
    cta: pickBestFit(["Discover", "Shop Now", "Learn More"], 20),
    hashtags: [`#LG${tag}`, `#${capitalize(scene).replace(/\s+/g, "")}`, "#OwnerLoved"],
    compliance: { ok: true, issues: [] },
    score: 0,
  };

  const scoreVariant = (v: MetaVariant): MetaVariant => {
    const allText = [v.primaryText, v.headline, v.description, v.cta].join(" | ");
    v.compliance = quickComply(allText);
    const ptFit = v.primaryText.length <= 125 ? 1 : 0;
    const hFit = v.headline.length <= 27 ? 1 : 0;
    const dFit = v.description.length <= 27 ? 1 : 0;
    const cFit = v.cta.length <= 20 ? 1 : 0;
    const richness = Math.min(1, v.primaryText.length / 110);
    const tokens = v.primaryText.toLowerCase().split(/\W+/).filter(Boolean);
    const diversity = tokens.length ? Math.min(1, new Set(tokens).size / tokens.length) : 0;
    const compliancePass = v.compliance.ok ? 1 : 0.7;
    v.score = Math.round(
      ((ptFit * 0.20) + (hFit * 0.15) + (dFit * 0.10) + (cFit * 0.05) + (richness * 0.20) + (diversity * 0.20) + (compliancePass * 0.10)) * 100
    );
    return v;
  };

  return [A, B, C].map(scoreVariant);
}

/* ── ChatGPT(대화형 AI) 광고문구 A/B/C variant generator ──
 * 규칙: Title ≤40자, Answer Body ≤200자, Follow-up Prompt ≤60자, CTA ≤20자
 * 3가지 기획 앵글: A) 직접 답변형  B) 비교 추천형  C) 문제 해결형
 */
export interface ChatGptAdVariant {
  id: "A" | "B" | "C";
  angle: string;
  angleEn: string;
  rationale: string;
  userIntent: string;      // 가정 질의(프롬프트)
  title: string;           // ≤40
  answer: string;          // ≤200
  proofLine: string;       // 리뷰 근거 한 줄
  followUp: string;        // ≤60
  cta: string;             // ≤20
  compliance: { ok: boolean; issues: string[] };
  score: number;
}

function buildChatGptAdVariants(pName: string, sentiment: SentimentResult): ChatGptAdVariant[] {
  const pos = sentiment.keywords.positive || [];
  const neg = sentiment.keywords.negative || [];
  const scenes = sentiment.usageScenes || [];
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const posPct = total ? Math.round((sentiment.positive / total) * 100) : 0;
  const s1 = pos[0] || "quality";
  const s2 = pos[1] || "performance";
  const s3 = pos[2] || "design";
  const pain = neg[0] || "";
  const scene = scenes[0] || "everyday life";
  const noun = deriveCategoryNoun(pName);
  const adj1 = toAdjectiveBenefit(s1);

  const A: ChatGptAdVariant = {
    id: "A",
    angle: "직접 답변형",
    angleEn: "Direct Answer",
    rationale: `"어떤 ${noun}이 좋아?" 류 탐색 질의에 결론부터 제시 — 대화형 AI 답변 인용 확률 극대화`,
    userIntent: `Which ${noun} should I buy?`,
    title: pickBestFit([`${adj1} ${noun}, Owner-Verified`, `${adj1} ${noun}`, adj1], 40),
    answer: pickBestFit([
      `Owners consistently point to ${s1} and ${s2} as the standout strengths of this ${noun}, with ${s3} noted as a bonus. Across ${total}+ reviews, ${posPct}% are positive.`,
      `Real owners highlight ${s1} and ${s2} in this ${noun}. ${posPct}% of ${total}+ reviews are positive.`,
    ], 200),
    proofLine: `리뷰 ${total}건 · 긍정 ${posPct}% · Top 키워드: ${pos.slice(0, 3).join(", ") || s1}`,
    followUp: pickBestFit([`Compare specs for my ${scene}?`, `Show owner reviews`], 60),
    cta: pickBestFit(["Learn More", "See Details", "Explore"], 20),
    compliance: { ok: true, issues: [] },
    score: 0,
  };

  const B: ChatGptAdVariant = {
    id: "B",
    angle: "비교 추천형",
    angleEn: "Comparison",
    rationale: `대체 옵션과의 비교 질의에 대응 — 경쟁사명 대신 카테고리 평균 대비 강점으로 우위 서술(법무 안전)`,
    userIntent: `How does this ${noun} compare to other options?`,
    title: pickBestFit([`${capitalize(s1)} That Owners Compare By`, `${capitalize(s1)} vs. the Rest`], 40),
    answer: pickBestFit([
      `Compared with other options in the same category, reviewers most often single out ${s1} and ${s2}. ${posPct}% of ${total}+ owner reviews are positive, with ${s3} frequently mentioned.`,
      `Reviewers comparing options in this category single out ${s1} and ${s2} — ${posPct}% positive across ${total}+ reviews.`,
    ], 200),
    proofLine: `비교 기준 키워드: ${[s1, s2, s3].join(" / ")} — 리뷰 기반 추출`,
    followUp: pickBestFit([`What do owners say about ${s2}?`, `Show a spec comparison`], 60),
    cta: pickBestFit(["Compare Now", "See Comparison", "Learn More"], 20),
    compliance: { ok: true, issues: [] },
    score: 0,
  };

  const C: ChatGptAdVariant = {
    id: "C",
    angle: "문제 해결형",
    angleEn: "Problem-Solving",
    rationale: pain
      ? `"${pain}" 관련 우려 질의를 선점 — 부정 VOC를 정직하게 다루며 신뢰 기반 전환 유도`
      : `사용 장면(${scene}) 기반 상황 질의 대응 — 구체 시나리오로 답변 적합도 상승`,
    userIntent: pain ? `Is ${pain} an issue with this ${noun}?` : `Which ${noun} fits my ${scene}?`,
    title: pickBestFit([
      pain ? `What Owners Say About ${capitalize(pain)}` : `Built for Your ${capitalize(scene)}`,
      pain ? `${capitalize(pain)}, Addressed` : `Made for ${capitalize(scene)}`,
    ], 40),
    answer: pickBestFit([
      pain
        ? `Some reviews mention ${pain}. Most owners, however, report strong ${s1} and ${s2} in daily use — ${posPct}% of ${total}+ reviews are positive, so weigh both sides before deciding.`
        : `For a ${scene} setup, owners point to ${s1} and ${s2} as the deciding factors, with ${s3} often mentioned. ${posPct}% of ${total}+ reviews are positive.`,
      pain
        ? `A few reviews mention ${pain}, while most owners praise ${s1} and ${s2} — ${posPct}% positive across ${total}+ reviews.`
        : `Owners in a ${scene} setup praise ${s1} and ${s2} — ${posPct}% positive across ${total}+ reviews.`,
    ], 200),
    proofLine: pain
      ? `부정 키워드 "${pain}" 선제 대응 · 긍정 ${posPct}%로 균형 서술`
      : `사용 장면 "${scene}" 기반 · 긍정 ${posPct}%`,
    followUp: pickBestFit([
      pain ? `How do owners handle ${pain}?` : `Show setups for my ${scene}`,
      `Show owner reviews`,
    ], 60),
    cta: pickBestFit(["See Reviews", "Learn More", "Explore"], 20),
    compliance: { ok: true, issues: [] },
    score: 0,
  };

  const scoreVariant = (v: ChatGptAdVariant): ChatGptAdVariant => {
    const allText = [v.title, v.answer, v.followUp, v.cta].join(" | ");
    v.compliance = quickComply(allText);
    const tFit = v.title.length <= 40 ? 1 : 0;
    const aFit = v.answer.length <= 200 ? 1 : 0;
    const fFit = v.followUp.length <= 60 ? 1 : 0;
    const cFit = v.cta.length <= 20 ? 1 : 0;
    const richness = Math.min(1, v.answer.length / 170);
    const tokens = v.answer.toLowerCase().split(/\W+/).filter(Boolean);
    const diversity = tokens.length ? Math.min(1, new Set(tokens).size / tokens.length) : 0;
    const compliancePass = v.compliance.ok ? 1 : 0.7;
    v.score = Math.round(
      ((tFit * 0.15) + (aFit * 0.20) + (fFit * 0.10) + (cFit * 0.05) + (richness * 0.20) + (diversity * 0.20) + (compliancePass * 0.10)) * 100
    );
    return v;
  };

  return [A, B, C].map(scoreVariant);
}

/* ── Affiliate Reviewer Brief generator ──
 * 리뷰어/퍼블리셔에게 전달할 구조화된 브리프를 자동 생성
 */
export interface AffiliateBrief {
  headline: string;
  hook: string;
  audience: string;
  keyPoints: string[];          // 3개 핵심 포인트
  proofPoints: string[];        // 리뷰 인용 또는 수치
  doList: string[];
  dontList: string[];
  ctaSuggestion: string;
  disclosure: string;
  longBrief: string;            // Markdown long form
  hashtags: string[];
  compliance: { ok: boolean; issues: string[] };
}

function buildAffiliateBrief(
  pName: string,
  sentiment: SentimentResult,
  reviews: { text: string; sentiment?: string; source?: string }[],
): AffiliateBrief {
  const pos = sentiment.keywords.positive || [];
  const neg = sentiment.keywords.negative || [];
  const scenes = sentiment.usageScenes || [];
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const posPct = total ? Math.round((sentiment.positive / total) * 100) : 0;
  const s1 = pos[0] || "quality";
  const s2 = pos[1] || "performance";
  const s3 = pos[2] || "design";
  const pain = neg[0] || "";
  const scene = scenes[0] || "everyday life";
  const noun = deriveCategoryNoun(pName);

  // Open reviews 인용 (LG.com 원문 비공개 정책 준수)
  const openReviews = reviews.filter(r => !r.source?.startsWith("lge_com") && r.sentiment === "positive");
  const proofQuotes = openReviews.slice(0, 2).map(r => {
    const t = r.text.length > 110 ? r.text.slice(0, 107) + "…" : r.text;
    return `"${t}"`;
  });
  const proofPoints: string[] = [];
  if (total > 0) proofPoints.push(`총 ${total}건 리뷰 분석 — 긍정 ${posPct}%`);
  if (pos.length) proofPoints.push(`Top 강점 키워드: ${pos.slice(0, 3).join(" · ")}`);
  if (proofQuotes.length) proofPoints.push(...proofQuotes);

  const headline = pickBestFit([
    `${pName} — Owner-Praised ${s1} & ${s2}`,
    `${pName} 리뷰 — 실사용자가 인정한 ${s1}`,
  ], 60);

  const hook = pain
    ? `If you've ever worried about ${pain} in a ${noun}, real owners say ${pName} delivers ${s1} that solves it.`
    : `Real owners praise ${pName} for ${s1} and ${s2} — here's why it earned ${posPct}% positive reviews.`;

  const audience = `${capitalize(scene)} 중심 사용자 · ${s1}/${s2}을(를) 중시하는 실사용 후기 신뢰형 구매층`;

  const keyPoints = [
    `✓ ${capitalize(s1)} — ${pos.length ? `리뷰에서 가장 자주 언급된 강점` : `핵심 베네핏`}`,
    `✓ ${capitalize(s2)} — 실사용 환경에서 검증된 성능`,
    pain
      ? `✓ ${capitalize(pain)} 우려를 ${s1} 메시지로 선제 해소`
      : `✓ ${capitalize(s3)} — 디자인/마감의 디테일`,
  ];

  const doList = [
    `실사용자 리뷰(긍정 ${posPct}%)를 데이터로 인용 — "Based on ${total} user reviews" 표기`,
    `${capitalize(scene)} 사용 장면을 시각·문장으로 구체화`,
    `광고 표기("Ad" / "광고") 및 affiliate 링크 disclosure 명시`,
    `${pName} 모델명·정확한 스펙은 LG 공식 PDP 링크로 fact-check`,
  ];
  const dontList = [
    `근거 없는 최상급 표현 금지 ("best", "#1", "world's first" 등)`,
    `경쟁사(Samsung·Sony·TCL 등) 직접 비교 금지 — 마스킹 처리`,
    `LG.com 리뷰 원문 인용 금지 (개인정보 보호 정책)`,
    `검증되지 않은 의료/안전/환경 효능 주장 금지`,
  ];
  const ctaSuggestion = `"Shop ${pName} on LG.com" 또는 "View Real Reviews" — affiliate 트래킹 링크 동봉`;
  const disclosure = `#Ad · #LGPartner · This post contains affiliate links. Reviews data sourced from public user reviews (n=${total}).`;

  const longBrief =
`## Affiliate Reviewer Brief — ${pName}

**🎯 Goal**: Drive consideration & conversion through credible third-party storytelling, anchored in real owner reviews.

**👤 Target Audience**: ${audience}

**💡 Hook (5s 이내)**:
> ${hook}

**🔑 Key Selling Points (반드시 포함)**:
${keyPoints.map(k => `- ${k.replace(/^✓ /, "")}`).join("\n")}

**📊 Proof Points (인용 가능 데이터)**:
${proofPoints.map(p => `- ${p}`).join("\n")}

**✅ Do**:
${doList.map(d => `- ${d}`).join("\n")}

**🚫 Don't**:
${dontList.map(d => `- ${d}`).join("\n")}

**📣 Suggested CTA**: ${ctaSuggestion}

**📜 Required Disclosure**: ${disclosure}

**🏷️ Hashtags**: #LG${noun.replace(/\s+/g, "")} #${capitalize(s1).replace(/\s+/g, "")} #RealReviews #Ad

**📐 Format Guide**:
- Long-form blog: 800–1,200 words · H2 3개 이상 · 실제 사용 사진 1매 이상
- YouTube/Reels: 60–90초 · 사용 장면(${scene}) 포함 · CTA 카드 5초
- Instagram Carousel: 5–7장 · 1장: Hook · 2~5장: Key Points · 마지막: CTA + Disclosure`;

  const compliance = quickComply(`${headline} ${hook} ${keyPoints.join(" ")} ${doList.join(" ")} ${ctaSuggestion}`);

  return {
    headline,
    hook,
    audience,
    keyPoints,
    proofPoints,
    doList,
    dontList,
    ctaSuggestion,
    disclosure,
    longBrief,
    hashtags: [`#LG${noun.replace(/\s+/g, "")}`, `#${capitalize(s1).replace(/\s+/g, "")}`, "#RealReviews", "#Ad"],
    compliance,
  };
}

/* ── Generate SEO/GEO script ── */
function generateSeoGeo(type: string, pName: string, sentiment: SentimentResult) {
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const s2 = sentiment.keywords.positive?.[1] || "performance";
  const pain = sentiment.keywords.negative?.[0] || "";

  if (type === "seo_brief") {
    return `── SEO Page Brief ──
🎯 Target Keyword: ${pName} review
📝 Meta Title: ${pName} Review — ${s1} & ${s2} | LG USA (${(pName + " Review — " + s1).length}/60 chars)
📝 Meta Description: Discover why users praise ${pName} for ${s1} and ${s2}. Read real user reviews and find out if it's right for you. (${150}/160 chars)

📑 H-Tag Outline:
H1: ${pName} — Real User Reviews & Insights
  H2: Top Strengths: ${s1}, ${s2}
  H2: ${pain ? `Addressing "${pain}"` : "What Users Say"}
    H3: Performance in Daily Use
    H3: Value for Money
  H2: Final Verdict`;
  }
  return `── GEO Featured Answer Script ──
${pName} is praised for ${s1} and ${s2} based on real user reviews. ${pain ? `While some mention "${pain}", most users report satisfaction.` : ""} Key specs and user-validated strengths make it a strong contender in its category. (${180}/200 chars)`;
}

/* ── Generate image prompt ── */
function generateImagePrompt(asset: typeof IMAGE_ASSETS[0], pName: string, sentiment: SentimentResult) {
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const scene = sentiment.usageScenes?.[0] || "modern living space";
  
  if (asset.platform.includes("LG.com")) {
    return `${pName} Hero Banner · ${asset.size} · Dark cinematic background with product hero shot. Highlight "${s1}". Copy overlay area left-side. Premium finish.`;
  }
  if (asset.platform.includes("Meta Feed")) {
    return `${pName} product photography, warm lifestyle, ${scene} setting, professional lighting, 8k, photorealistic --ar 1:1 --v 6`;
  }
  if (asset.platform.includes("Stories")) {
    return `${pName} in ${scene}, vertical composition, lifestyle photography, warm natural light, UGC style --ar 9:16 --v 6`;
  }
  if (asset.platform.includes("YouTube")) {
    return `${pName} thumbnail, dramatic lighting, product hero with text overlay area, bold colors --ar 16:9 --v 6`;
  }
  return `${pName} display ad · ${asset.size} · Clean product shot, ${s1} highlight, CTA-ready composition`;
}

/* ── Generate AI tool prompt ── */
function generateAiPrompt(tool: string, pName: string, sentiment: SentimentResult) {
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const s2 = sentiment.keywords.positive?.[1] || "performance";
  const pain = sentiment.keywords.negative?.[0] || "";
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const evidence = `Based on ${total} reviews. Positive: ${sentiment.positive}, Negative: ${sentiment.negative}.`;

  switch (tool) {
    case "chatgpt":
      return `You are an LG Electronics marketing copywriter. Generate 5 ad copy variations for ${pName}.\n\nProduct Strengths: ${s1}, ${s2}\n${pain ? `Customer Concern: ${pain}` : ""}\n${evidence}\n\nRules:\n- No superlatives without evidence\n- No competitor comparisons\n- Focus on real user praise points\n- Generate: Google RSA, Meta Feed, YouTube TrueView copies`;
    case "claude":
      return `Create a comprehensive SEO content brief for ${pName}.\n\nReview insights: Users praise ${s1} and ${s2}. ${pain ? `Some mention "${pain}" as a concern.` : ""}\n${evidence}\n\nInclude: H-tag outline, meta description, 3 blog section drafts, FAQ schema (5 Q&As), and internal linking suggestions.`;
    case "gemini":
      return `Optimize this product for AI search (GEO). Product: ${pName}\n\nKey strengths: ${s1}, ${s2}\n${evidence}\n\nGenerate:\n1. Featured Answer snippet (200 chars max)\n2. Knowledge panel summary\n3. "People Also Ask" Q&A pairs (5)\n4. Conversational AI response script`;
    case "midjourney":
      return `${pName} product photography, ${sentiment.usageScenes?.[0] || "modern living room"} setting, warm lifestyle, professional lighting, 8k, photorealistic --ar 16:9 --v 6`;
    case "perplexity":
      return `Search: "${pName} review 2024" — Check if our Featured Answer appears.\nExpected answer should highlight: ${s1}, ${s2}\n${evidence}`;
    case "firefly":
      return `Professional product shot of ${pName} in ${sentiment.usageScenes?.[0] || "modern setting"}. Style: commercial photography. Lighting: studio. Background: clean gradient. Usage: advertising (royalty-free).`;
    case "suno":
      return `Create a 15-second advertising jingle for ${pName}.\nMood: Modern, premium, uplifting\nKey message: "${s1}" and "${s2}"\nStyle: Minimalist electronic with warm undertones\nTempo: 100-120 BPM`;
    case "heygen":
      return `Create a 30-second AI avatar video script for ${pName}.\n\n[0-5s] Hook: "What if ${pain || "your expectation"} was exceeded?"\n[5-20s] Body: Introduce ${pName}, highlight ${s1} and ${s2}. Show product in use.\n[20-30s] CTA: "Experience it yourself at lg.com"\n\nAvatar: Professional, friendly tone. Background: Modern home setting.`;
    default:
      return `Generate marketing content for ${pName}. Strengths: ${s1}, ${s2}. ${evidence}`;
  }
}

export function MarketingHub({
  geoMessages: _geoMessages,
  productName,
  displayName,
  totalReviews,
  marketing,
  sentiment,
  reviews,
}: MarketingHubProps) {
  const { t } = useLang();
  const [selectedFunnel, setSelectedFunnel] = useState("awareness");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pmax: true, meta: true, affiliate: true, adcopy: true, faq: false, seogeo: false, image: false, aitools: false, crm: false,
  });

  const toggleSection = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const copyText = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) { setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000); }
    toast.success(t("Copied!", "복사 완료!"));
  };

  const pName = displayName || productName;

  /* Filtered channels for active funnel */
  const funnelChannels = useMemo(() => {
    return ALL_CHANNELS.filter(ch => ch.funnels.includes(selectedFunnel));
  }, [selectedFunnel]);

  /* Channel copies */
  const channelCopies = useMemo(() => {
    return funnelChannels.map(ch => ({
      channel: ch,
      ...generateCopy(ch, pName, sentiment),
    }));
  }, [funnelChannels, pName, sentiment]);

  /* Funnel VOC insight */
  const funnelInsight = useMemo(() => {
    return buildFunnelInsight(selectedFunnel, sentiment, reviews, pName);
  }, [selectedFunnel, sentiment, reviews, pName]);

  /* PMAX A/B/C variants */
  const pmaxVariants = useMemo(() => buildPmaxVariants(pName, sentiment), [pName, sentiment]);
  const pmaxWinner = useMemo(() => {
    return pmaxVariants.reduce((best, v) => (v.score > best.score ? v : best), pmaxVariants[0]);
  }, [pmaxVariants]);
  const [adoptedPmax, setAdoptedPmax] = useState<"A" | "B" | "C" | null>(null);

  /* Meta Primary Text A/B/C variants */
  const metaVariants = useMemo(() => buildMetaVariants(pName, sentiment), [pName, sentiment]);
  const metaWinner = useMemo(() => {
    return metaVariants.reduce((best, v) => (v.score > best.score ? v : best), metaVariants[0]);
  }, [metaVariants]);
  const [adoptedMeta, setAdoptedMeta] = useState<"A" | "B" | "C" | null>(null);

  /* Affiliate brief */
  const affiliateBrief = useMemo(() => buildAffiliateBrief(pName, sentiment, reviews), [pName, sentiment, reviews]);

  /* Auto-translate funnel source quotes to Korean */
  const [translatedQuotes, setTranslatedQuotes] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!funnelInsight.sourceQuotes.length) return;
    const toTranslate = funnelInsight.sourceQuotes.filter(q => !translatedQuotes[q]);
    if (!toTranslate.length) return;

    let cancelled = false;
    setIsTranslating(true);

    Promise.all(
      toTranslate.map(async (q) => {
        try {
          const { data } = await supabase.functions.invoke("translate-review", { body: { text: q } });
          return { original: q, translated: data?.translated || q };
        } catch {
          return { original: q, translated: q };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setTranslatedQuotes((prev) => {
        const next = { ...prev };
        for (const r of results) next[r.original] = r.translated;
        return next;
      });
      setIsTranslating(false);
    });

    return () => { cancelled = true; };
  }, [funnelInsight.sourceQuotes]);

  return (
    <div className="gradient-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold font-heading text-foreground tracking-tight">
            Marketing Asset Studio
          </h2>
          <Badge variant="secondary" className="text-[10px] ml-2">{totalReviews}건 리뷰 기반</Badge>
          <Badge variant="outline" className="text-[9px] ml-1 border-primary/30 text-primary">36+ 에셋</Badge>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 text-[10px] gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => {
              exportMarketingAssets(productName, pName, sentiment);
              toast.success("마케팅 에셋 XLSX 다운로드 완료!");
            }}
          >
            <Download className="h-3.5 w-3.5" />
            전체 내보내기 (XLSX)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {pName}의 실제 리뷰 기반 — 15개 광고 포맷 + FAQ 4종 + SEO/GEO 2종 + 이미지 7사이즈 + AI툴 8종
        </p>
      </div>

      <div className="p-6 space-y-4">

        {/* ═══ 1. 퍼널 목표 설정 ═══ */}
        <div>
          <SectionHeader title="🎯 광고 목적 (퍼널 단계)" subtitle="캠페인 목적 선택 → 해당 채널 자동 필터" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {AD_FUNNELS.map(f => {
              const isActive = selectedFunnel === f.key;
              return (
                <button key={f.key} onClick={() => setSelectedFunnel(f.key)}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all ${isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 bg-card"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={isActive ? "text-primary" : "text-muted-foreground"}>{f.icon}</span>
                    <span className={`text-xs font-bold ${isActive ? "text-primary" : "text-foreground"}`}>{f.labelKo}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{f.descKo}</p>
                  {isActive && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ 1-b. 퍼널별 VOC 인사이트 ═══ */}
        {funnelInsight.message && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">💡</span>
              <h4 className="text-xs font-bold text-foreground">
                {AD_FUNNELS.find(f => f.key === selectedFunnel)?.labelKo} — VOC 기반 메시지 전략
              </h4>
            </div>

            {/* 핵심 메시지 */}
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted-foreground mb-1 font-semibold">📌 핵심 메시지</p>
              <p className="text-xs font-bold text-foreground">{funnelInsight.message}</p>
            </div>

            {/* 전략 */}
            <div className="rounded-lg bg-card border border-border p-3">
              <p className="text-[10px] text-muted-foreground mb-1 font-semibold">🎯 실행 전략</p>
              <p className="text-xs text-foreground/90">{funnelInsight.strategy}</p>
            </div>

            {/* 키워드 + 소스 리뷰 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 활용 키워드 */}
              <div className="rounded-lg bg-card border border-border p-3">
                <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold">🏷️ 카피 활용 키워드</p>
                <div className="flex flex-wrap gap-1">
                  {funnelInsight.keywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>
                  ))}
                </div>
              </div>

              {/* 소스 리뷰 (국문 번역) */}
              <div className="rounded-lg bg-card border border-border p-3">
                <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold">
                  📝 카피 소스 (실사용자 리뷰)
                  {isTranslating && <span className="ml-1 text-primary animate-pulse">번역 중…</span>}
                </p>
                {funnelInsight.sourceQuotes.length > 0 ? (
                  <div className="space-y-2">
                    {funnelInsight.sourceQuotes.map((q, i) => {
                      const ko = translatedQuotes[q];
                      return (
                        <div key={i} className="border-l-2 border-primary/30 pl-2 space-y-0.5">
                          <p className="text-[10px] font-medium text-foreground/90">
                            🇺🇸 "{q}"
                          </p>
                          {ko && ko !== q && (
                            <p className="text-[9px] text-muted-foreground italic line-clamp-1">
                              🇰🇷 {ko}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">LG.com 리뷰는 개인정보 보호 정책에 따라 원문 비공개 — 감성 키워드 기반 활용</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ 1-c. 🧪 Google PMAX 헤드라인 A/B/C 자동 변형 ═══ */}
        <Collapsible open={openSections.pmax} onOpenChange={() => toggleSection("pmax")}>
          <CollapsibleTrigger className="w-full">
            <SectionHeader
              title="🧪 Google PMAX 헤드라인 A/B/C 자동 변형"
              subtitle="채널 규칙(헤드라인 ≤30자, 롱헤드라인 ≤90자, 디스크립션 ≤90자) 기반 3개 앵글 변형 + 점수 비교"
              collapsible
              isOpen={openSections.pmax}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pmaxVariants.map((v) => {
                const isWinner = v.id === pmaxWinner.id;
                const isAdopted = adoptedPmax === v.id;
                const blockText =
                  `[PMAX Variant ${v.id} — ${v.angle}]\n` +
                  v.headlines.map((h, i) => `Headline ${i + 1} (${h.length}/30): ${h}`).join("\n") +
                  `\nLong Headline (${v.longHeadline.length}/90): ${v.longHeadline}\n` +
                  v.descriptions.map((d, i) => `Description ${i + 1} (${d.length}/90): ${d}`).join("\n");
                const key = `pmax-${v.id}`;
                return (
                  <div
                    key={v.id}
                    className={`relative rounded-xl border-2 p-3 space-y-2 transition-all ${
                      isAdopted
                        ? "border-primary bg-primary/5 shadow-md"
                        : isWinner
                        ? "border-amber-400/60 bg-amber-50/30"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge className="text-[10px] bg-[#1a8a4a] text-white">Variant {v.id}</Badge>
                        <span className="text-[10px] font-semibold text-foreground">{v.angle}</span>
                        {isWinner && (
                          <Badge variant="outline" className="text-[9px] gap-0.5 border-amber-500/50 text-amber-700 bg-amber-50">
                            <Trophy className="h-2.5 w-2.5" /> 추천
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-[11px] font-bold text-primary">{v.score}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground italic leading-snug">{v.rationale}</p>

                    {/* Compliance */}
                    <div>
                      {v.compliance.ok ? (
                        <Badge variant="outline" className="text-[9px] gap-0.5 border-[#15803D]/30 text-[#15803D]">
                          <ShieldCheck className="h-3 w-3" /> 규정 OK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] gap-0.5 border-amber-500/30 text-amber-600">
                          <AlertTriangle className="h-3 w-3" /> {v.compliance.issues.length} fix
                        </Badge>
                      )}
                    </div>

                    {/* Headlines */}
                    <div className="space-y-1 pt-1">
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Headlines (≤30자)</p>
                      {v.headlines.map((h, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 group">
                          <p className="text-[11px] font-semibold text-foreground/90 flex-1 truncate">{i + 1}. {h}</p>
                          <span className={`text-[9px] shrink-0 ${h.length > 30 ? "text-destructive font-bold" : "text-[#15803D]"}`}>
                            {h.length}/30
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Long Headline */}
                    <div className="space-y-0.5 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Long Headline</p>
                        <span className={`text-[9px] ${v.longHeadline.length > 90 ? "text-destructive font-bold" : "text-[#15803D]"}`}>
                          {v.longHeadline.length}/90
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground/85 leading-snug">{v.longHeadline}</p>
                    </div>

                    {/* Descriptions */}
                    <div className="space-y-1 pt-1">
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Descriptions (≤90자)</p>
                      {v.descriptions.map((d, i) => (
                        <div key={i} className="space-y-0.5">
                          <p className="text-[10px] text-foreground/80 leading-snug">{i + 1}. {d}</p>
                          <span className={`text-[9px] ${d.length > 90 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                            {d.length}/90
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-[10px] gap-1"
                        onClick={() => copyText(blockText, key)}
                      >
                        {copiedKey === key ? <Check className="h-3 w-3 text-[#15803D]" /> : <Copy className="h-3 w-3" />}
                        {copiedKey === key ? "복사됨" : "복사"}
                      </Button>
                      <Button
                        variant={isAdopted ? "default" : "secondary"}
                        size="sm"
                        className="flex-1 h-7 text-[10px]"
                        onClick={() => setAdoptedPmax(isAdopted ? null : v.id)}
                      >
                        {isAdopted ? "✓ 채택됨" : "이 안 채택"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison summary */}
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-[10px] text-foreground/80 leading-relaxed">
              <span className="font-bold text-foreground">📊 비교 요약 — </span>
              {pmaxVariants.map((v, i) => (
                <span key={v.id}>
                  <strong className={v.id === pmaxWinner.id ? "text-amber-700" : ""}>
                    {v.id}({v.angle}) {v.score}점
                  </strong>
                  {i < pmaxVariants.length - 1 ? " · " : ""}
                </span>
              ))}
              {" — "}
              <span className="text-muted-foreground">
                추천안: <strong className="text-amber-700">Variant {pmaxWinner.id}</strong> · 한도 준수·다양성·표현 풍부도 종합 산출
                {adoptedPmax && ` · 현재 채택: Variant ${adoptedPmax}`}
              </span>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ 1-d. 📘 Meta Primary Text A/B/C 자동 변형 ═══ */}
        <Collapsible open={openSections.meta} onOpenChange={() => toggleSection("meta")}>
          <CollapsibleTrigger className="w-full">
            <SectionHeader
              title="📘 Meta Primary Text 강화 — A/B/C 자동 변형"
              subtitle="Meta 규칙(Primary Text ≤125자, Headline ≤27자, CTA ≤20자) 기반 3개 톤 변형 + 점수 비교"
              collapsible
              isOpen={openSections.meta}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {metaVariants.map((v) => {
                const isWinner = v.id === metaWinner.id;
                const isAdopted = adoptedMeta === v.id;
                const blockText =
                  `[Meta Variant ${v.id} — ${v.angle}]\n` +
                  `Primary Text (${v.primaryText.length}/125): ${v.primaryText}\n` +
                  `Headline (${v.headline.length}/27): ${v.headline}\n` +
                  `Description (${v.description.length}/27): ${v.description}\n` +
                  `CTA (${v.cta.length}/20): ${v.cta}\n` +
                  `Hashtags: ${v.hashtags.join(" ")}`;
                const key = `meta-${v.id}`;
                return (
                  <div
                    key={v.id}
                    className={`relative rounded-xl border-2 p-3 space-y-2 transition-all ${
                      isAdopted
                        ? "border-primary bg-primary/5 shadow-md"
                        : isWinner
                        ? "border-amber-400/60 bg-amber-50/30"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge className="text-[10px] bg-[#1a52d4] text-white">Variant {v.id}</Badge>
                        <span className="text-[10px] font-semibold text-foreground">{v.angle}</span>
                        {isWinner && (
                          <Badge variant="outline" className="text-[9px] gap-0.5 border-amber-500/50 text-amber-700 bg-amber-50">
                            <Trophy className="h-2.5 w-2.5" /> 추천
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-[11px] font-bold text-primary">{v.score}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground italic leading-snug">{v.rationale}</p>

                    <div>
                      {v.compliance.ok ? (
                        <Badge variant="outline" className="text-[9px] gap-0.5 border-[#15803D]/30 text-[#15803D]">
                          <ShieldCheck className="h-3 w-3" /> 규정 OK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] gap-0.5 border-amber-500/30 text-amber-600">
                          <AlertTriangle className="h-3 w-3" /> {v.compliance.issues.length} fix
                        </Badge>
                      )}
                    </div>

                    {/* Primary Text */}
                    <div className="space-y-0.5 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Primary Text</p>
                        <span className={`text-[9px] ${v.primaryText.length > 125 ? "text-destructive font-bold" : "text-[#15803D]"}`}>
                          {v.primaryText.length}/125
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground/90 leading-snug">{v.primaryText}</p>
                    </div>

                    {/* Headline */}
                    <div className="space-y-0.5 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Headline</p>
                        <span className={`text-[9px] ${v.headline.length > 27 ? "text-destructive font-bold" : "text-[#15803D]"}`}>
                          {v.headline.length}/27
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-foreground/90">{v.headline}</p>
                    </div>

                    {/* Description */}
                    <div className="space-y-0.5 pt-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
                        <span className={`text-[9px] ${v.description.length > 27 ? "text-destructive font-bold" : "text-[#15803D]"}`}>
                          {v.description.length}/27
                        </span>
                      </div>
                      <p className="text-[10px] text-foreground/80">{v.description}</p>
                    </div>

                    {/* CTA + Hashtags */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div>
                        <span className="text-[9px] text-muted-foreground">CTA: </span>
                        <Badge variant="secondary" className="text-[10px]">{v.cta}</Badge>
                      </div>
                      <span className={`text-[9px] ${v.cta.length > 20 ? "text-destructive font-bold" : "text-[#15803D]"}`}>
                        {v.cta.length}/20
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {v.hashtags.map((h, i) => (
                        <span key={i} className="text-[9px] text-primary">{h}</span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-[10px] gap-1"
                        onClick={() => copyText(blockText, key)}
                      >
                        {copiedKey === key ? <Check className="h-3 w-3 text-[#15803D]" /> : <Copy className="h-3 w-3" />}
                        {copiedKey === key ? "복사됨" : "복사"}
                      </Button>
                      <Button
                        variant={isAdopted ? "default" : "secondary"}
                        size="sm"
                        className="flex-1 h-7 text-[10px]"
                        onClick={() => setAdoptedMeta(isAdopted ? null : v.id)}
                      >
                        {isAdopted ? "✓ 채택됨" : "이 안 채택"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-[10px] text-foreground/80 leading-relaxed">
              <span className="font-bold text-foreground">📊 비교 요약 — </span>
              {metaVariants.map((v, i) => (
                <span key={v.id}>
                  <strong className={v.id === metaWinner.id ? "text-amber-700" : ""}>
                    {v.id}({v.angle}) {v.score}점
                  </strong>
                  {i < metaVariants.length - 1 ? " · " : ""}
                </span>
              ))}
              {" — "}
              <span className="text-muted-foreground">
                추천안: <strong className="text-amber-700">Variant {metaWinner.id}</strong>
                {adoptedMeta && ` · 현재 채택: Variant ${adoptedMeta}`}
              </span>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ 1-e. 📄 Affiliate 리뷰어 브리프 자동화 ═══ */}
        <Collapsible open={openSections.affiliate} onOpenChange={() => toggleSection("affiliate")}>
          <CollapsibleTrigger className="w-full">
            <SectionHeader
              title="📄 Affiliate 리뷰어 브리프 자동화"
              subtitle="리뷰 데이터 기반 리뷰어/퍼블리셔용 구조화 브리프 — Hook, Key Points, Do/Don't, Disclosure 자동 생성"
              collapsible
              isOpen={openSections.affiliate}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] bg-[#6B21A8] text-white"><Megaphone className="h-3 w-3 mr-1" />Affiliate Brief</Badge>
                  {affiliateBrief.compliance.ok ? (
                    <Badge variant="outline" className="text-[9px] gap-0.5 border-[#15803D]/30 text-[#15803D]">
                      <ShieldCheck className="h-3 w-3" /> 규정 OK
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] gap-0.5 border-amber-500/30 text-amber-600">
                      <AlertTriangle className="h-3 w-3" /> {affiliateBrief.compliance.issues.length} fix
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1"
                  onClick={() => copyText(affiliateBrief.longBrief, "aff-long")}
                >
                  {copiedKey === "aff-long" ? <Check className="h-3 w-3 text-[#15803D]" /> : <Copy className="h-3 w-3" />}
                  {copiedKey === "aff-long" ? "복사됨" : "전체 브리프 복사"}
                </Button>
              </div>

              {/* Headline + Hook */}
              <div className="space-y-1">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Headline</p>
                <p className="text-sm font-bold text-foreground">{affiliateBrief.headline}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Hook (5초 이내)</p>
                <p className="text-[12px] text-foreground/90 italic border-l-2 border-primary/40 pl-2">{affiliateBrief.hook}</p>
              </div>

              {/* Audience */}
              <div className="space-y-1">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Target Audience</p>
                <p className="text-[11px] text-foreground/85">{affiliateBrief.audience}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Key Points */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-foreground">🔑 Key Selling Points</p>
                  {affiliateBrief.keyPoints.map((k, i) => (
                    <p key={i} className="text-[11px] text-foreground/85">{k}</p>
                  ))}
                </div>
                {/* Proof Points */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-foreground">📊 Proof Points</p>
                  {affiliateBrief.proofPoints.map((p, i) => (
                    <p key={i} className="text-[11px] text-foreground/85 leading-snug">• {p}</p>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Do */}
                <div className="rounded-lg border border-[#15803D]/30 bg-[#15803D]/5 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-[#15803D]">✅ Do</p>
                  {affiliateBrief.doList.map((d, i) => (
                    <p key={i} className="text-[11px] text-foreground/85 leading-snug">• {d}</p>
                  ))}
                </div>
                {/* Don't */}
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <p className="text-[10px] font-bold text-destructive">🚫 Don't</p>
                  {affiliateBrief.dontList.map((d, i) => (
                    <p key={i} className="text-[11px] text-foreground/85 leading-snug">• {d}</p>
                  ))}
                </div>
              </div>

              {/* CTA + Disclosure */}
              <div className="rounded-lg border border-amber-400/40 bg-amber-50/40 p-3 space-y-1.5">
                <div>
                  <p className="text-[10px] font-bold text-amber-800">📣 Suggested CTA</p>
                  <p className="text-[11px] text-foreground/85">{affiliateBrief.ctaSuggestion}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-800">📜 Required Disclosure</p>
                  <p className="text-[11px] text-foreground/85 italic">{affiliateBrief.disclosure}</p>
                </div>
              </div>

              {/* Hashtags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground">Hashtags:</span>
                {affiliateBrief.hashtags.map((h, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{h}</Badge>
                ))}
              </div>

              {/* Long form preview */}
              <details className="rounded-lg border border-border bg-muted/10 p-2">
                <summary className="text-[11px] font-semibold text-foreground cursor-pointer flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Long-form Brief 미리보기 (Markdown)
                </summary>
                <pre className="mt-2 text-[10px] text-foreground/80 whitespace-pre-wrap leading-snug font-mono">
{affiliateBrief.longBrief}
                </pre>
              </details>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ 2. ⚡ 광고 카피 (Ad Copy) — 채널별 ═══ */}
        <Collapsible open={openSections.adcopy} onOpenChange={() => toggleSection("adcopy")}>
          <CollapsibleTrigger className="w-full">
            <SectionHeader
              title={`⚡ 광고 카피 — ${AD_FUNNELS.find(f => f.key === selectedFunnel)?.labelKo} (${funnelChannels.length}개 채널)`}
              subtitle="퍼널에 매핑된 채널별 카피를 자동 생성합니다"
              collapsible isOpen={openSections.adcopy} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2.5">
            {channelCopies.map((cc, i) => {
              const key = `ch-${selectedFunnel}-${i}`;
              return (
                <div key={key} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] text-white" style={{ backgroundColor: cc.channel.color }}>{cc.channel.label}</Badge>
                      <span className="text-[9px] text-muted-foreground">{cc.channel.format}</span>
                      {cc.compliance.ok ? (
                        <Badge variant="outline" className="text-[9px] gap-0.5 border-[#15803D]/30 text-[#15803D]"><ShieldCheck className="h-3 w-3" /> OK</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] gap-0.5 border-amber-500/30 text-amber-600"><AlertTriangle className="h-3 w-3" /> {cc.compliance.issues.length} fix</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyText(cc.fullText, key)}>
                      {copiedKey === key ? <Check className="h-3 w-3 text-[#15803D]" /> : <Copy className="h-3 w-3" />}
                      {copiedKey === key ? "복사됨" : "전체 복사"}
                    </Button>
                  </div>
                  {/* Fields */}
                  {cc.channel.fields.map((f, fi) => {
                    const val = cc.fieldValues[f.name] || "";
                    const len = val.length;
                    const fKey = `${key}-${fi}`;
                    return (
                      <div key={fi} className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-muted-foreground mb-0.5">
                            {f.name} · <span className={len > f.max ? "text-destructive font-bold" : "text-[#15803D]"}>{len}/{f.max}ch</span>
                          </p>
                          <p className={`text-xs whitespace-pre-wrap break-words ${fi === 0 ? "font-bold" : "text-foreground/80"}`}>{val}</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-6 text-[9px] shrink-0" onClick={() => copyText(val, fKey)}>
                          {copiedKey === fKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ 3. ❓ FAQ 콘텐츠 — 4 목적 ═══ */}
        <Collapsible open={openSections.faq} onOpenChange={() => toggleSection("faq")}>
          <CollapsibleTrigger className="w-full">
            <SectionHeader title="❓ FAQ 콘텐츠 — 목적별 4종" subtitle="PDP · GEO · SEO · CRM/CS 각각에 최적화된 FAQ" collapsible isOpen={openSections.faq} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {FAQ_PURPOSES.map(fp => (
                <div key={fp.key} className="p-3 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span>{fp.icon}</span>
                    <Badge variant="secondary" className="text-[10px] font-bold">{fp.label}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{fp.desc}</p>
                </div>
              ))}
            </div>
            <FaqPanel productName={productName} displayName={displayName} sentiment={sentiment} reviews={reviews} locale="en-US" />
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ 4. 📝 SEO·GEO 스크립트 ═══ */}
        <Collapsible open={openSections.seogeo} onOpenChange={() => toggleSection("seogeo")}>
          <CollapsibleTrigger className="w-full">
            <SectionHeader title="📝 SEO·GEO 스크립트 — 2종" subtitle="검색 최적화 브리프 및 AI 검색 답변 스크립트" collapsible isOpen={openSections.seogeo} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3">
            {SEO_GEO_TYPES.map((sg, i) => {
              const script = generateSeoGeo(sg.key, pName, sentiment);
              const sgKey = `seogeo-${i}`;
              return (
                <div key={sg.key} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{sg.icon}</span>
                      <span className="text-xs font-bold">{sg.label}</span>
                      <span className="text-[9px] text-muted-foreground">({sg.usage})</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyText(script, sgKey)}>
                      {copiedKey === sgKey ? <Check className="h-3 w-3 text-[#15803D]" /> : <Copy className="h-3 w-3" />}
                      복사
                    </Button>
                  </div>
                  <pre className="text-[11px] text-foreground/80 whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-3 leading-relaxed">{script}</pre>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ 5. 🎨 이미지 에셋 방향 — 7사이즈 ═══ */}
        <Collapsible open={openSections.image} onOpenChange={() => toggleSection("image")}>
          <CollapsibleTrigger className="w-full">
            <SectionHeader title="🎨 이미지 에셋 방향 — 7사이즈" subtitle="플랫폼별 이미지 프롬프트 및 제작 툴 안내" collapsible isOpen={openSections.image} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {IMAGE_ASSETS.map((ia, i) => {
                const prompt = generateImagePrompt(ia, pName, sentiment);
                const iaKey = `img-${i}`;
                return (
                  <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-mono">{ia.size}</Badge>
                      <Badge variant="secondary" className="text-[9px]">{ia.tool}</Badge>
                    </div>
                    <p className="text-xs font-bold">{ia.platform}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{prompt}</p>
                    <Button variant="outline" size="sm" className="w-full h-7 text-[10px] gap-1" onClick={() => copyText(prompt, iaKey)}>
                      {copiedKey === iaKey ? <Check className="h-3 w-3 text-[#15803D]" /> : <Copy className="h-3 w-3" />}
                      {copiedKey === iaKey ? "복사됨" : "프롬프트 복사"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ 6. CRM Segment (리타겟팅) ═══ */}
        {marketing.crmInsights && (
          <Collapsible open={openSections.crm} onOpenChange={() => toggleSection("crm")}>
            <CollapsibleTrigger className="w-full">
              <SectionHeader title="📞 리타겟팅 · CRM 세그먼트 인사이트" subtitle="리뷰 기반 CRM 대응 전략과 세그먼트 아이디어" collapsible isOpen={openSections.crm} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                  <p className="text-[10px] font-semibold text-rose-600 mb-1">⚡ 기대 괴리</p>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{marketing.crmInsights.expectationGap}</p>
                </div>
                <div className="p-3 rounded-lg border border-amber-600/20 bg-amber-600/5">
                  <p className="text-[10px] font-semibold text-amber-700 mb-1">💰 서비스 기회</p>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{marketing.crmInsights.serviceOpportunity}</p>
                </div>
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <p className="text-[10px] font-semibold text-primary mb-1">🤝 CRM 대응</p>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{marketing.crmInsights.crmResponse}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ═══ 7. 🤖 AI 툴 프롬프트 스튜디오 — 8종 ═══ */}
        <Collapsible open={openSections.aitools} onOpenChange={() => toggleSection("aitools")}>
          <CollapsibleTrigger className="w-full">
            <SectionHeader title="🤖 AI 툴 프롬프트 스튜디오 — 8종" subtitle="각 AI 툴에 최적화된 프롬프트를 자동 생성합니다" collapsible isOpen={openSections.aitools} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AI_TOOLS.map((tool, i) => {
                const prompt = generateAiPrompt(tool.key, pName, sentiment);
                const toolKey = `ai-${i}`;
                return (
                  <div key={tool.key} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tool.icon}</span>
                        <div>
                          <p className="text-xs font-bold">{tool.label}</p>
                          <p className="text-[9px] text-muted-foreground">{tool.desc}</p>
                        </div>
                      </div>
                      <a href={tool.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[9px] text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> 열기
                      </a>
                    </div>
                    <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-2.5 leading-relaxed max-h-24 overflow-y-auto">{prompt}</pre>
                    <Button variant="outline" size="sm" className="w-full h-7 text-[10px] gap-1" onClick={() => copyText(prompt, toolKey)}>
                      {copiedKey === toolKey ? <Check className="h-3 w-3 text-[#15803D]" /> : <Copy className="h-3 w-3" />}
                      {copiedKey === toolKey ? "복사됨" : "프롬프트 복사"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ LG Twin Crew Anita + 미디어 에셋 ═══ */}
        <ContentCreationActions productName={productName} displayName={displayName} />
      </div>
    </div>
  );
}
