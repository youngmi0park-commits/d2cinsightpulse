import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FaqPanel } from "@/components/FaqPanel";
import { ContentCreationActions } from "@/components/ContentCreationActions";
import { useLang } from "@/contexts/LanguageContext";
import {
  Wrench, Copy, Eye, MousePointer, ShoppingCart, RefreshCw,
  Check, ShieldCheck, AlertTriangle, ChevronDown, ChevronRight,
  ExternalLink, Download,
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
  { key: "google_pmax", label: "Google PMAX", color: "#1a8a4a", format: "Headlines ×5 + Descriptions ×2", fields: [{ name: "Headline", max: 30 }, { name: "Description", max: 90 }], funnels: ["conversion"] },
  { key: "google_rsa", label: "Google Search RSA", color: "#1a8a4a", format: "Headlines ×5 + Descriptions ×2", fields: [{ name: "Headline", max: 30 }, { name: "Description", max: 90 }], funnels: ["consideration", "conversion"] },
  { key: "google_gdn", label: "Google Display/GDN", color: "#1a8a4a", format: "Short Headline + Long Headline + Description + CTA", fields: [{ name: "Short Headline", max: 25 }, { name: "Long Headline", max: 90 }, { name: "Description", max: 90 }, { name: "CTA", max: 15 }], funnels: ["awareness"] },
  { key: "meta_feed", label: "Meta Feed", color: "#1a52d4", format: "Primary Text + Headline + Description + CTA", fields: [{ name: "Primary Text", max: 125 }, { name: "Headline", max: 27 }, { name: "Description", max: 27 }, { name: "CTA", max: 20 }], funnels: ["consideration", "conversion"] },
  { key: "meta_stories", label: "Meta Stories/Reels", color: "#1a52d4", format: "Hook + Caption + CTA", fields: [{ name: "Caption", max: 125 }, { name: "CTA", max: 20 }], funnels: ["awareness", "conversion"] },
  { key: "meta_carousel", label: "Meta Carousel", color: "#1a52d4", format: "Card별 Headline + Body + CTA", fields: [{ name: "Headline", max: 40 }, { name: "Body", max: 125 }, { name: "CTA", max: 20 }], funnels: ["consideration", "conversion"] },
  { key: "criteo_retargeting", label: "Criteo Retargeting", color: "#F57C00", format: "Headline + Description + CTA", fields: [{ name: "Headline", max: 25 }, { name: "Description", max: 38 }, { name: "CTA", max: 15 }], funnels: ["conversion", "retention"] },
  { key: "criteo_sponsored", label: "Criteo Sponsored", color: "#F57C00", format: "Headline + Description + CTA", fields: [{ name: "Headline", max: 25 }, { name: "Description", max: 38 }, { name: "CTA", max: 15 }], funnels: ["conversion"] },
  { key: "youtube_bumper", label: "YouTube Bumper 6s", color: "#c4302b", format: "Script + Visual Note", fields: [{ name: "Script", max: 30 }, { name: "Visual Note", max: 90 }], funnels: ["awareness"] },
  { key: "youtube_trueview", label: "YouTube TrueView", color: "#c4302b", format: "Hook(5s) + Body(30s) + CTA Overlay", fields: [{ name: "Hook", max: 60 }, { name: "Body", max: 200 }, { name: "CTA", max: 20 }], funnels: ["consideration", "conversion"] },
  { key: "lgcom_hero", label: "LG.com Hero Banner", color: "#A50034", format: "Eyebrow + Headline + Subheadline + CTA", fields: [{ name: "Eyebrow", max: 40 }, { name: "Headline", max: 50 }, { name: "Subheadline", max: 80 }, { name: "CTA", max: 35 }], funnels: ["awareness", "consideration"] },
  { key: "lgcom_pdp", label: "LG.com PDP 배너", color: "#A50034", format: "Headline + Body + CTA", fields: [{ name: "Headline", max: 50 }, { name: "Body", max: 80 }, { name: "CTA", max: 35 }], funnels: ["conversion"] },
  { key: "lgcom_email", label: "LG.com Email/CRM", color: "#A50034", format: "Subject + Body + CTA", fields: [{ name: "Subject", max: 60 }, { name: "Body", max: 200 }, { name: "CTA", max: 25 }], funnels: ["retention"] },
  { key: "affiliate_reviewer", label: "Affiliate 리뷰어 브리프", color: "#6B21A8", format: "Brief Headline + Key Points ×3 + CTA 제안", fields: [{ name: "Headline", max: 60 }, { name: "Key Point", max: 80 }, { name: "CTA", max: 25 }], funnels: ["consideration", "conversion"] },
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

  // English-first ad copy strategy (Korean rationale shown as secondary annotation)
  switch (funnel) {
    case "awareness":
      return {
        message: `Lead with "${posKw[0] || "quality"}" — ${posPct}% positive sentiment builds trust at first impression`,
        sourceQuotes: pickQuotes(posReviews, 2),
        keywords: posKw.slice(0, 4),
        strategy: `Repeat core strengths (${posKw.slice(0, 2).join(", ")}) across short-form awareness placements (YouTube Bumper, GDN) to reinforce brand recall. (브랜드 연상 강화)`,
      };
    case "consideration":
      return {
        message: `${posPct}% of real users satisfied — pair "${posKw[0] || "performance"}" with "${scenes[0] || "everyday"}" usage scenes to drive PDP exploration`,
        sourceQuotes: pickQuotes(posReviews, 2),
        keywords: [...posKw.slice(0, 2), ...(scenes.length ? [scenes[0]] : [])],
        strategy: negKw[0]
          ? `Pre-empt "${negKw[0]}" concerns with comparison content + review-based social proof to extend PDP dwell time. (우려 선제 해소)`
          : `Use review-based social proof and usage scenes (${scenes[0] || "everyday"}) video to drive PDP visits. (PDP 방문 유도)`,
      };
    case "conversion":
      return {
        message: negKw[0]
          ? `Resolve "${negKw[0]}" concern + amplify "${posKw[0] || "satisfaction"}" → support purchase decision`
          : `"${posKw[0] || "Quality"}" validated — ${total} reviews provide purchase confidence`,
        sourceQuotes: [...pickQuotes(posReviews, 1), ...pickQuotes(negReviews, 1)],
        keywords: [...posKw.slice(0, 2), ...(negKw[0] ? [negKw[0]] : [])],
        strategy: `Place real-user satisfaction data (${posPct}% positive) and ${negKw[0] ? `"${negKw[0]}" resolution messaging` : "core strength reaffirmation"} on PDP & retargeting banners to prevent cart abandonment. (장바구니 이탈 방지)`,
      };
    case "retention":
      return {
        message: `Leverage existing customers' "${posKw[0] || "satisfaction"}" experience — cross-sell & upsell messaging`,
        sourceQuotes: pickQuotes(posReviews.length ? posReviews : openReviews, 2),
        keywords: posKw.slice(0, 3),
        strategy: `Use high satisfaction (${posPct}%) to power referral programs + same-category new-product email CRM campaigns. (CRM 리텐션)`,
      };
    default:
      return { message: "", sourceQuotes: [], keywords: [], strategy: "" };
  }
}

/* ── Helpers ── */
function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

function cleanCopy(text: string): string {
  return text.replace(/\b(best|#1|unprecedented|most reliable|top-rated|number one|world's first|unmatched|ultimate)\b/gi, "").replace(/\s{2,}/g, " ").trim();
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

/* ── Generate channel copy (NO product/SKU mentions in ad surfaces) ── */
function generateCopy(channel: ChannelDef, pName: string, sentiment: SentimentResult) {
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const s2 = sentiment.keywords.positive?.[1] || "performance";
  const pain = sentiment.keywords.negative?.[0] || "";
  const scene = sentiment.usageScenes?.[0] || "living room";
  // Generic category noun replaces SKU/model in all ad-facing fields
  const noun = deriveCategoryNoun(pName);
  // Owned channels (LG.com, CRM email) may keep brand context — but still no model code
  const ownedChannel = channel.key.startsWith("lgcom_") || channel.key === "lgcom_email";

  const fieldValues: Record<string, string> = {};
  for (const f of channel.fields) {
    let val = "";
    switch (f.name) {
      case "Short Headline":
        // Benefit-led, no SKU
        val = `${capitalize(s1)}, Redefined`; break;
      case "Headline":
        val = ownedChannel ? `${capitalize(s1)} You Can Feel` : `${capitalize(s1)} Meets ${capitalize(s2)}`; break;
      case "Long Headline":
        val = `Experience ${s1} and ${s2} in your ${scene}. A new standard.`; break;
      case "Description": case "Body": case "Primary Text":
        val = pain
          ? `Worried about "${pain}"? Real users say otherwise — ${s1} praised consistently.`
          : `Praised for outstanding ${s1} and ${s2}. See what real users say.`; break;
      case "CTA":
        val = "Shop Now"; break;
      case "Eyebrow":
        val = "New Arrival"; break;
      case "Subheadline":
        val = `${capitalize(s1)} and ${s2} — praised by real users`; break;
      case "Subject":
        // Owned CRM channel — generic category, no SKU
        val = `Your Next ${noun}: An Exclusive Offer Inside`; break;
      case "Caption":
        // Lifestyle scene + benefit, no SKU
        val = `Bring ${s1} into your ${scene}. "${capitalize(s1)}" — the feature customers love.`; break;
      case "Script":
        // 6-sec bumper — benefit hook only
        val = `${capitalize(s1)}. In every ${scene}.`; break;
      case "Visual Note":
        val = `Lifestyle ${scene} → benefit text overlay (${s1}) → CTA`; break;
      case "Hook":
        val = pain
          ? `What if "${pain}" wasn't an issue anymore?`
          : `Imagine ${s1} in your ${scene}.`; break;
      case "Key Point":
        val = `✓ ${capitalize(s1)} ✓ ${capitalize(s2)} ✓ Trusted by real users`; break;
      default:
        val = `${capitalize(s1)} ${capitalize(s2)}`;
    }
    // 채널별 max 글자수 가이드 엄격 준수 — 전매체 모두 한도 내로 자동 단축
    fieldValues[f.name] = truncate(cleanCopy(val), f.max);
  }

  const fullText = Object.entries(fieldValues).map(([k, v]) => `${k}: ${v}`).join("\n");
  const compliance = quickComply(fullText);
  return { fieldValues, compliance, fullText: `[${channel.label}]\n${fullText}` };
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
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
    adcopy: true, faq: false, seogeo: false, image: false, aitools: false, crm: false,
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
