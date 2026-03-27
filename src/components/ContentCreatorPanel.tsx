import { useState, useMemo } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Copy, Check, Wand2, ShieldCheck, AlertTriangle, CheckCircle2,
  Monitor, Film, Palette, ChevronDown, ChevronRight, Info,
  Zap, Heart, Home, Scale, ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LG_COMPONENT_SPECS,
  LOCALES,
  BANNER_IMAGE_STYLES,
  type BannerImageStyleKey,
} from "@/data/lgContentSpecs";
import { getComplianceChecks } from "@/lib/adComplianceRules";
import type { SentimentResult } from "@/lib/sentiment";
import type { MarketingOutput } from "@/lib/formatMessage";

// ─── Message Types ───
type MessageType = "usp_highlight" | "pain_reversal" | "using_scene" | "comparison";

const MESSAGE_TYPES: {
  key: MessageType;
  icon: React.ReactNode;
  labelEn: string;
  labelKo: string;
  descEn: string;
  descKo: string;
  color: string;
}[] = [
  {
    key: "usp_highlight",
    icon: <Zap className="h-4 w-4" />,
    labelEn: "USP Highlight",
    labelKo: "강점 강조형",
    descEn: "Review Strength-based — Hero, NPI Banner, Digital Ad",
    descKo: "리뷰 Strength 기반 — 히어로, NPI 배너, 디지털 광고",
    color: "border-emerald-500/40 bg-emerald-500/5",
  },
  {
    key: "pain_reversal",
    icon: <Heart className="h-4 w-4" />,
    labelEn: "Pain Reversal",
    labelKo: "불안/오해 해소형",
    descEn: "Pain → Solution — PDP FAQ, Remarketing, Guide Content",
    descKo: "Pain → 솔루션 — PDP FAQ, 리마케팅, 가이드 콘텐츠",
    color: "border-amber-500/40 bg-amber-500/5",
  },
  {
    key: "using_scene",
    icon: <Home className="h-4 w-4" />,
    labelEn: "Using Scene",
    labelKo: "사용 장면 기반",
    descEn: "Lifestyle UGC/Ad — SNS Shorts, YouTube, Lifestyle Banner",
    descKo: "라이프스타일 UGC/광고 — SNS 숏폼, 유튜브, 라이프스타일 배너",
    color: "border-blue-500/40 bg-blue-500/5",
  },
  {
    key: "comparison",
    icon: <Scale className="h-4 w-4" />,
    labelEn: "Reason-to-Buy",
    labelKo: "구매 이유형",
    descEn: "Natural differentiation (legal-safe) — Landing, Comparison, Campaign",
    descKo: "자연스러운 차별화 (법무 적합) — 랜딩, 비교 섹션, 캠페인",
    color: "border-violet-500/40 bg-violet-500/5",
  },
];

// ─── Content Purposes ───
interface ContentPurpose {
  key: string;
  icon: string;
  labelEn: string;
  labelKo: string;
  channel: "inside" | "outside";
  specId?: string;
}

const CONTENT_PURPOSES: ContentPurpose[] = [
  { key: "pdp_hero", icon: "🖼️", labelEn: "PDP Hero Banner", labelKo: "PDP 히어로 배너", channel: "inside", specId: "ST0001" },
  { key: "pdp_feature", icon: "📐", labelEn: "PDP Feature Highlight", labelKo: "PDP 피처 하이라이트", channel: "inside", specId: "ST0013" },
  { key: "faq_section", icon: "❓", labelEn: "FAQ Section Improvement", labelKo: "FAQ 섹션 개선", channel: "inside" },
  { key: "remarketing", icon: "🎯", labelEn: "Remarketing Banner", labelKo: "리마케팅 배너", channel: "inside" },
  { key: "sns_short", icon: "📱", labelEn: "SNS Shorts", labelKo: "SNS 숏폼", channel: "outside" },
  { key: "youtube_trueview", icon: "🎬", labelEn: "YouTube TrueView Ad", labelKo: "YouTube TrueView 광고", channel: "outside" },
  { key: "meta_ad", icon: "📘", labelEn: "Meta Ad (Facebook/Instagram)", labelKo: "Meta 광고 (Facebook/Instagram)", channel: "outside" },
  { key: "criteo_pmax", icon: "🟠", labelEn: "Criteo / PMax Campaign", labelKo: "Criteo / PMax 캠페인", channel: "outside" },
  { key: "display_ad", icon: "🖥️", labelEn: "Display Ad (GDN)", labelKo: "디스플레이 광고 (GDN)", channel: "outside" },
  { key: "store_promo", icon: "🏬", labelEn: "Store Promo KV", labelKo: "스토어 프로모션용 KV", channel: "outside" },
];

// ─── Props ───
interface ContentCreatorPanelProps {
  productName: string;
  displayName: string;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string }[];
  marketing: MarketingOutput;
}

// ─── Generated output shape ───
interface GeneratedContent {
  headline: string;
  subMessage: string;
  faqMessage?: { q: string; a: string };
  imageGuide: string;
  insideVersion: string;
  outsideVersion: string;
  pmaxAssets?: { headlines: string[]; longHeadline: string; descriptions: string[] };
  exportPrompts: { tool: string; prompt: string; url?: string; isAI?: boolean }[];
  legalStatus: "pass" | "needs_revision" | "fail";
  legalViolations: string[];
  fullPrompt: string;
}

export function ContentCreatorPanel({
  productName,
  displayName,
  sentiment,
  reviews,
  marketing: _marketing,
}: ContentCreatorPanelProps) {
  const { t, lang } = useLang();
  const [messageType, setMessageType] = useState<MessageType>("usp_highlight");
  const [contentPurpose, setContentPurpose] = useState("pdp_hero");
  const [locale, setLocale] = useState("en-US");
  const [bannerStyle, setBannerStyle] = useState<BannerImageStyleKey>("product_solo");
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showLegal, setShowLegal] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);

  const prName = displayName || productName;
  const selectedPurpose = CONTENT_PURPOSES.find((p) => p.key === contentPurpose)!;
  const spec = selectedPurpose?.specId
    ? LG_COMPONENT_SPECS.find((s) => s.id === selectedPurpose.specId)
    : null;

  // ─── Extract review insights ───
  const strengths = useMemo(() => {
    const phrases = sentiment.phrases?.positive || [];
    const kw = sentiment.keywords.positive || [];
    return phrases.length >= 3 ? phrases.slice(0, 5) : [...phrases, ...kw].slice(0, 5);
  }, [sentiment]);

  const painPoints = useMemo(() => {
    const neg = sentiment.keywords.negative || [];
    const negPhrases = sentiment.phrases?.negative || [];
    return negPhrases.length > 0 ? negPhrases.slice(0, 5) : neg.slice(0, 5);
  }, [sentiment]);

  const usingScenes = useMemo(() => {
    return (sentiment.usageScenes || []).slice(0, 6).map((s) => s.replace(/\s*\(\d+x\)$/, ""));
  }, [sentiment]);

  const uspKeywords = useMemo(() => {
    const allPositive = [...(sentiment.phrases?.positive || []), ...(sentiment.keywords.positive || [])];
    return allPositive.filter((k) => k.length > 3 && k.length < 40).slice(0, 8);
  }, [sentiment]);

  const total = sentiment.positive + sentiment.negative + sentiment.neutral;

  // ─── Auto-generated messages per type ───
  const autoMessages = useMemo(() => {
    const s1 = strengths[0] || "Quality";
    const s2 = strengths[1] || "Performance";
    const s3 = strengths[2] || "Design";
    const p1 = painPoints[0] || "common concern";
    const scene1 = usingScenes[0] || "living room";
    const scene2 = usingScenes[1] || "kitchen";

    return {
      usp_highlight: {
        headline: `${prName} — ${s1}. ${s2}. ${s3}.`,
        sub: t(
          `Users repeatedly praise ${s1.toLowerCase()}, ${s2.toLowerCase()}, and ${s3.toLowerCase()} — the top 3 strengths from real reviews.`,
          `실사용자들이 반복적으로 칭찬한 ${s1}, ${s2}, ${s3} — 리뷰에서 추출한 Top 3 강점입니다.`
        ),
        faqQ: "",
        faqA: "",
      },
      pain_reversal: {
        headline: t(
          `Concerned about ${p1}? Real users say otherwise.`,
          `${p1}이(가) 걱정되시나요? 실사용자들의 답변은 다릅니다.`
        ),
        sub: t(
          `"${s1}" — confirmed by multiple user reviews. Addressing "${p1}" with real evidence.`,
          `"${s1}" — 다수의 리뷰에서 반복 확인됨. "${p1}"에 대한 실제 근거로 해소합니다.`
        ),
        faqQ: t(
          `Is ${p1} really an issue with this product?`,
          `${p1}이(가) 실제로 문제가 되나요?`
        ),
        faqA: t(
          `Based on ${total} reviews, "${s1}" is mentioned positively far more frequently. Real users describe their experience as exceeding expectations in this area.`,
          `${total}건의 리뷰를 분석한 결과, "${s1}"이(가) 훨씬 더 자주 긍정적으로 언급됩니다. 실사용자들은 기대 이상이라고 평가합니다.`
        ),
      },
      using_scene: {
        headline: t(
          `From ${scene1} to ${scene2} — your screen goes wherever you go`,
          `${scene1}에서 ${scene2}까지 — 어디든 함께하는 스크린`
        ),
        sub: t(
          `Real customers use ${prName} in ${usingScenes.slice(0, 3).join(", ")} — a portable experience that adapts to your lifestyle.`,
          `실제 고객들은 ${prName}을(를) ${usingScenes.slice(0, 3).join(", ")}에서 사용합니다 — 라이프스타일에 맞춘 이동형 경험.`
        ),
        faqQ: "",
        faqA: "",
      },
      comparison: {
        headline: t(
          `What makes ${prName} the choice? Customers explain.`,
          `${prName}을(를) 선택하는 이유? 고객들이 설명합니다.`
        ),
        sub: t(
          `"${s1}" and "${s2}" — the most frequently mentioned reasons customers chose this product over alternatives.`,
          `"${s1}"과(와) "${s2}" — 고객들이 대안 대비 이 제품을 선택한 가장 많이 언급된 이유입니다.`
        ),
        faqQ: "",
        faqA: "",
      },
    };
  }, [prName, strengths, painPoints, usingScenes, total, t]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(t("Copied to clipboard", "클립보드에 복사되었습니다"));
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const CopyBtn = ({ text, id, label }: { text: string; id: string; label?: string }) => (
    <Button variant="outline" size="sm" onClick={() => copyText(text, id)} className="h-7 text-[10px] gap-1">
      {copiedKey === id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {label || t("Copy", "복사")}
    </Button>
  );

  // ─── Legal check ───
  const runLegalCheck = (text: string): { status: "pass" | "needs_revision" | "fail"; violations: string[] } => {
    const violations: string[] = [];
    const superlatives = ["best", "#1", "unprecedented", "most reliable", "top-rated", "number one", "world's first"];
    const comparatives = ["better than", "superior to", "beats", "outperforms", "compared to"];
    const lower = text.toLowerCase();
    for (const s of superlatives) {
      if (lower.includes(s)) violations.push(`[General #9] Unsubstantiated superlative: "${s}" — remove or add evidence`);
    }
    for (const c of comparatives) {
      if (lower.includes(c)) violations.push(`[Comparative #31] Direct comparison: "${c}" — reframe`);
    }
    if (selectedPurpose.channel === "outside" && !lower.includes("ad") && !lower.includes("광고")) {
      violations.push(`[General #20] Outside channel must include "Ad" / "광고" label`);
    }
    return { status: violations.length === 0 ? "pass" : violations.length <= 2 ? "needs_revision" : "fail", violations };
  };

  // ─── Generate content ───
  const generateContent = () => {
    const msg = autoMessages[messageType];
    const purposeLabel = lang === "en" ? selectedPurpose.labelEn : selectedPurpose.labelKo;
    const localeLabel = LOCALES.find((l) => l.key === locale)?.label || locale;
    const msgTypeInfo = MESSAGE_TYPES.find((m) => m.key === messageType)!;
    const channelLabel = selectedPurpose.channel === "inside" ? "Inside Channel" : "Outside Channel";

    const strengthsList = strengths.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const painList = painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n");
    const sceneList = usingScenes.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const evidence = `Based on ${total} reviews. Positive: ${sentiment.positive}, Negative: ${sentiment.negative}. Avg: ${(sentiment.averageScore * 100).toFixed(0)}/100.`;

    const specInfo = spec
      ? `\n📐 Component Spec (${spec.id}):\n  Desktop: ${spec.desktopSize} / Mobile: ${spec.mobileSize}\n  Headline: max ${spec.textLimits.headline || "N/A"} chars / Body: max ${spec.textLimits.body || "N/A"} chars / CTA: max ${spec.textLimits.cta || "N/A"} chars`
      : "";

    // Banner style for PDP hero
    const selectedBannerStyle = BANNER_IMAGE_STYLES.find((s) => s.key === bannerStyle);
    const bannerInfo = contentPurpose === "pdp_hero" && selectedBannerStyle
      ? `\n🖼️ Image Style: ${selectedBannerStyle.labelEn}\n  ${selectedBannerStyle.descEn}`
      : "";

    const fullPrompt = `🎯 Content Creation Brief
━━━━━━━━━━━━━━━━━━━━━━
📦 Product: ${prName}
📍 Target: ${localeLabel} via ${channelLabel}
🏷️ Message Type: ${lang === "en" ? msgTypeInfo.labelEn : msgTypeInfo.labelKo}
📄 Content Purpose: ${purposeLabel}

── Review-Driven Insights (Auto-Extracted) ──

💪 Strength Top 3:
${strengthsList || "N/A"}

🔧 Pain Points + Resolution:
${painList || "N/A"}

🏠 Using Scenes:
${sceneList || "N/A"}

🔑 USP Keywords:
${uspKeywords.join(", ") || "N/A"}

📊 Evidence:
${evidence}
${specInfo}${bannerInfo}

── Generated Content ──

▣ Headline:
${msg.headline}

▣ Sub Message:
${msg.sub}
${msg.faqQ ? `\n▣ FAQ:\nQ. ${msg.faqQ}\nA. ${msg.faqA}` : ""}

── Locale Rules: ${localeLabel} ──
${locale.startsWith("en") ? "• American/British English conventions\n• Avoid cultural-specific references" : locale === "ko-KR" ? "• 한국어 경어체 사용\n• 과장 표현 금지" : "• Follow local language conventions"}

── Legal Compliance ──
🚫 No superlatives without evidence
🚫 No direct competitor comparisons
🚫 No unverified claims
${selectedPurpose.channel === "outside" ? '✅ Must include "Ad" / "광고" label' : "✅ Product page link required"}
✅ Data source: "Based on ${total} user reviews"`;

    // Image guide based on content purpose + message type
    let imageGuide = "";
    const sceneRef = usingScenes[0] || "modern living space";
    switch (contentPurpose) {
      case "pdp_hero":
        imageGuide = bannerStyle === "lifestyle_cut"
          ? `Lifestyle photography: ${prName} naturally placed in ${sceneRef}. Warm natural light, real-home atmosphere. Desktop: ${spec?.desktopSize || "1920×720"}. Mobile: ${spec?.mobileSize || "720×960"}. No text in image.`
          : bannerStyle === "usp_feature"
          ? `Feature close-up: Dramatic detail shot of "${strengths[0] || "key feature"}". Dark gradient. Precision lighting. Desktop: ${spec?.desktopSize || "1920×720"}.`
          : bannerStyle === "before_after"
          ? `Split composition: Problem ("${painPoints[0] || "frustration"}") → Solution with product. Clear visual transformation. Desktop: ${spec?.desktopSize || "1920×720"}.`
          : `Clean product hero on gradient. Product center-right, text area left. Premium finish. Desktop: ${spec?.desktopSize || "1920×720"}.`;
        break;
      case "pdp_feature":
        imageGuide = `Split layout: product detail on one side, text on other. Highlight "${strengths[0] || "quality"}". Close-up for key features. 1600px wide.`;
        break;
      case "faq_section":
        imageGuide = `Infographic-style: Clean icons + bullet points. Use product thumbnail alongside FAQ content. Brand colors: #A50034 accent.`;
        break;
      case "remarketing":
        imageGuide = `Dynamic banner: 300×250, 728×90, 160×600. Product + key benefit text overlay. Pain reversal messaging. High contrast CTA.`;
        break;
      case "sns_short":
        imageGuide = `Vertical 9:16 (1080×1920). Product in ${sceneRef}. Hook in first 3 seconds. Text overlay for claims. End with CTA + product shot. "Ad" label required.`;
        break;
      case "youtube_trueview":
        imageGuide = `16:9 (1920×1080). First 5s must hook: "${messageType === "using_scene" ? `Product in ${sceneRef}` : msg.headline}". Show real usage → product reveal → CTA.`;
        break;
      case "meta_ad":
        imageGuide = `Meta Ads: Feed (1080×1080 square, 1200×628 landscape), Stories/Reels (1080×1920 vertical). Product hero + bold benefit text. Primary text max 125 chars, headline max 40 chars. "Ad" label auto-applied by platform. High contrast CTA button.`;
        break;
      case "criteo_pmax":
        imageGuide = `Criteo: 300×250, 728×90, 160×600, 320×50. Product center, price/offer overlay. Headline max 25 chars, desc max 45 chars.\nPMax: Responsive — landscape 1200×628, square 1200×1200, portrait 960×1200. Headlines (max 30 chars ×15), long headline (max 90 chars), descriptions (max 90 chars ×5). Clean product hero + lifestyle variants.`;
        break;
      case "display_ad":
        imageGuide = `GDN Display: Multiple sizes — 300×250, 728×90, 160×600, 336×280, responsive. Product hero + 1 line benefit text. Brand consistent. High contrast CTA.`;
        break;
      case "store_promo":
        imageGuide = `KV layout: Product center, promotional overlay (badge/sticker). Space for price/offer callout. Print-ready 300dpi or digital 72dpi.`;
        break;
    }

    // Inside vs Outside channel versions
    const insideVersion = `${prName} — ${strengths[0] || "Quality"}. ${strengths[1] || "Performance"}. ${strengths[2] || "Design"}.\n${evidence}`;
    const outsideVersion = contentPurpose === "meta_ad"
      ? `[Ad] ${msg.headline}\n\nPrimary text (125 chars): ${(msg.sub).slice(0, 125)}\nHeadline (40 chars): ${(prName + " — " + (strengths[0] || "Quality")).slice(0, 40)}\nDescription (30 chars): ${(strengths[1] || "Shop Now").slice(0, 30)}\nCTA: Shop Now`
      : contentPurpose === "criteo_ad"
      ? `Criteo Dynamic Ad\nHeadline (25 chars): ${(prName).slice(0, 25)}\nDescription (45 chars): ${(strengths[0] || "Premium quality").slice(0, 45)}\nProduct image: Clean hero shot\nCTA: Learn More`
      : `[Ad] ${messageType === "using_scene" ? `From ${usingScenes[0] || "bedroom"} to ${usingScenes[1] || "kitchen"} — ${prName}` : msg.headline}\n3-second hook → lifestyle scene → product reveal`;

    // Export prompts with bridges
    const styleScene = bannerStyle === "lifestyle_cut" ? sceneRef : "studio";
    const exportPrompts = [
      {
        tool: "Midjourney",
        prompt: `${prName} product photography, ${messageType === "using_scene" ? `warm lifestyle, ${sceneRef}` : "studio, premium"}, professional lighting, 8k, photorealistic --ar ${contentPurpose === "pdp_hero" ? "8:3" : contentPurpose === "sns_short" ? "9:16" : "16:9"} --v 6`,
        url: "https://www.midjourney.com",
      },
      {
        tool: "Adobe Firefly",
        prompt: `Professional ${messageType === "using_scene" ? "lifestyle" : "product"} shot of ${prName} in ${styleScene}. Lighting: ${messageType === "using_scene" ? "natural, warm" : "studio"}. Background: ${messageType === "using_scene" ? "real home" : "dark gradient"}.`,
        url: "https://firefly.adobe.com",
      },
      {
        tool: "Runway",
        prompt: `Slow reveal of ${prName} in ${styleScene}. Camera: ${messageType === "using_scene" ? "slow pan" : "dolly in"}. 5s. Cinematic. End: product hero.`,
        url: "https://app.runwayml.com",
      },
      {
        tool: "Canva",
        prompt: `Template: ${contentPurpose === "sns_short" ? "Instagram Story" : contentPurpose === "pdp_hero" ? "Website Banner" : contentPurpose === "meta_ad" ? "Facebook Ad" : contentPurpose === "criteo_ad" ? "Display Ad 300x250" : "Social Media Post"}. Brand: LG Electronics (#A50034). Headline: "${msg.headline}".`,
        url: "https://www.canva.com",
      },
    ];

    const allText = `${msg.headline} ${msg.sub} ${insideVersion} ${outsideVersion}`;
    const legal = runLegalCheck(allText);

    setGenerated({
      headline: msg.headline,
      subMessage: msg.sub,
      faqMessage: msg.faqQ ? { q: msg.faqQ, a: msg.faqA } : undefined,
      imageGuide,
      insideVersion,
      outsideVersion,
      exportPrompts,
      legalStatus: legal.status,
      legalViolations: legal.violations,
      fullPrompt,
    });
  };

  if (reviews.length < 3) return null;

  const currentMsgType = MESSAGE_TYPES.find((m) => m.key === messageType)!;
  const autoMsg = autoMessages[messageType];

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Palette className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold font-heading">
          {t("Review → Content Creator", "리뷰 → 컨텐츠 제작")}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          "Select message type → content purpose → generate copy, image guide & export prompts for external tools",
          "메시지 타입 선택 → 콘텐츠 목적 선택 → 카피, 이미지 가이드 & 외부 툴 프롬프트 자동 생성"
        )}
      </p>

      {/* ═══ STEP 1: Message Type ═══ */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground text-[10px]">STEP 1</Badge>
          <span className="text-sm font-semibold">{t("Message Type", "메시지 타입")}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MESSAGE_TYPES.map((mt) => (
            <button
              key={mt.key}
              onClick={() => { setMessageType(mt.key); setGenerated(null); }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                messageType === mt.key
                  ? `${mt.color} border-primary shadow-sm`
                  : "border-border bg-secondary/10 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={messageType === mt.key ? "text-primary" : "text-muted-foreground"}>{mt.icon}</span>
                <span className="text-xs font-semibold">{lang === "en" ? mt.labelEn : mt.labelKo}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {lang === "en" ? mt.descEn : mt.descKo}
              </p>
            </button>
          ))}
        </div>

        {/* Auto-generated preview */}
        <div className={`rounded-lg border p-3 space-y-1.5 ${currentMsgType.color}`}>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {t("Auto-Generated Preview", "자동 생성 미리보기")}
          </p>
          <p className="text-sm font-bold text-foreground/90">{autoMsg.headline}</p>
          <p className="text-xs text-muted-foreground">{autoMsg.sub}</p>
          {autoMsg.faqQ && (
            <div className="mt-1 text-xs bg-background/50 rounded p-2">
              <p className="font-medium">Q. {autoMsg.faqQ}</p>
              <p className="text-muted-foreground mt-0.5">A. {autoMsg.faqA}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ STEP 2: Content Purpose ═══ */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground text-[10px]">STEP 2</Badge>
          <span className="text-sm font-semibold">{t("Content Purpose", "콘텐츠 목적")}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Inside */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <Monitor className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary">Inside Channel</span>
              <span className="text-[9px] text-muted-foreground">(LG.com / PDP / Email)</span>
            </div>
            {CONTENT_PURPOSES.filter((p) => p.channel === "inside").map((p) => (
              <button
                key={p.key}
                onClick={() => { setContentPurpose(p.key); setGenerated(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium border transition-all ${
                  contentPurpose === p.key
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-foreground/80 hover:border-primary/40"
                }`}
              >
                <span>{p.icon}</span>
                {lang === "en" ? p.labelEn : p.labelKo}
              </button>
            ))}
          </div>

          {/* Outside */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <Film className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary">Outside Channel</span>
              <span className="text-[9px] text-muted-foreground">(SNS / YouTube / Display)</span>
            </div>
            {CONTENT_PURPOSES.filter((p) => p.channel === "outside").map((p) => (
              <button
                key={p.key}
                onClick={() => { setContentPurpose(p.key); setGenerated(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium border transition-all ${
                  contentPurpose === p.key
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-foreground/80 hover:border-primary/40"
                }`}
              >
                <span>{p.icon}</span>
                {lang === "en" ? p.labelEn : p.labelKo}
              </button>
            ))}
          </div>
        </div>

        {/* Banner Style (PDP Hero only) */}
        {contentPurpose === "pdp_hero" && (
          <div className="space-y-1.5 mt-2 p-3 rounded-lg border border-border bg-secondary/10">
            <p className="text-[10px] font-medium text-muted-foreground">{t("Image Style", "이미지 스타일")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {BANNER_IMAGE_STYLES.map((style) => (
                <button
                  key={style.key}
                  onClick={() => setBannerStyle(style.key as BannerImageStyleKey)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] border transition-all ${
                    bannerStyle === style.key
                      ? "bg-accent text-accent-foreground border-accent shadow-sm"
                      : "bg-background border-border text-foreground/70 hover:border-accent/40"
                  }`}
                >
                  <span className="text-sm">{style.icon}</span>
                  <div className="min-w-0">
                    <span className="font-medium">{lang === "en" ? style.labelEn : style.labelKo}</span>
                    <p className="text-[9px] text-muted-foreground truncate">{lang === "en" ? style.descEn : style.descKo}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ STEP 3: Locale ═══ */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground text-[10px]">STEP 3</Badge>
          <span className="text-sm font-semibold">{t("Locale & Settings", "언어 & 설정")}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LOCALES.map((l) => (
            <button
              key={l.key}
              onClick={() => setLocale(l.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                locale === l.key
                  ? "bg-primary border-primary/50 text-primary-foreground"
                  : "bg-background border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spec Reference */}
      {spec && (
        <Collapsible open={showSpecs} onOpenChange={setShowSpecs}>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
            {showSpecs ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Monitor className="h-3.5 w-3.5" />
            <span className="font-medium">{t("Component Spec", "컴포넌트 스펙")}: {spec.id}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 rounded-lg border border-border bg-secondary/20 text-xs space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Desktop:</span> <span className="font-mono">{spec.desktopSize}</span></div>
              <div><span className="text-muted-foreground">Mobile:</span> <span className="font-mono">{spec.mobileSize}</span></div>
              {spec.textLimits.headline && <div><span className="text-muted-foreground">Headline:</span> max {spec.textLimits.headline} chars</div>}
              {spec.textLimits.body && <div><span className="text-muted-foreground">Body:</span> max {spec.textLimits.body} chars</div>}
            </div>
            <p className="text-muted-foreground mt-1"><Info className="h-3 w-3 inline mr-1" />{spec.notes}</p>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Review Insights Preview */}
      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2 text-xs">
        <p className="font-semibold text-primary text-[11px]">
          📊 {t("Review Interpreter (Auto-populated)", "리뷰 인터프리터 (자동 삽입)")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <span className="text-muted-foreground">💪 Strength Top 3:</span>
            <p className="text-foreground/80">{strengths.slice(0, 3).join(", ") || "N/A"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">🔧 Pain + Resolution:</span>
            <p className="text-foreground/80">{painPoints.slice(0, 2).join(", ") || "N/A"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">🏠 Using Scene:</span>
            <p className="text-foreground/80">{usingScenes.slice(0, 3).join(", ") || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <Button onClick={generateContent} className="w-full gap-2">
        <Wand2 className="h-4 w-4" />
        {t("Generate Content", "콘텐츠 생성")}
      </Button>

      {/* ═══ GENERATED RESULT ═══ */}
      {generated && (
        <div className="space-y-4 border-t border-border pt-5">
          {/* Legal Status */}
          <div className={`p-3 rounded-lg border ${
            generated.legalStatus === "pass" ? "border-green-500/30 bg-green-500/10" : "border-yellow-500/30 bg-yellow-500/10"
          }`}>
            <div className="flex items-center gap-2">
              {generated.legalStatus === "pass" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm font-medium">
                {t("Legal Compliance", "법무 컴플라이언스")}:
                <Badge variant="outline" className={`ml-2 text-[10px] ${
                  generated.legalStatus === "pass" ? "text-green-500 border-green-500/30" : "text-yellow-500 border-yellow-500/30"
                }`}>
                  {generated.legalStatus.toUpperCase()}
                </Badge>
              </span>
            </div>
            {generated.legalViolations.length > 0 && (
              <ul className="text-xs text-foreground/80 space-y-1 mt-2">
                {generated.legalViolations.map((v, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" /> {v}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Headline */}
          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">▣ PDP Headline</span>
              <CopyBtn text={generated.headline} id="headline" />
            </div>
            <p className="text-lg font-bold font-heading leading-snug">{generated.headline}</p>
          </div>

          {/* Sub Message */}
          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">▣ Sub Message</span>
              <CopyBtn text={generated.subMessage} id="sub" />
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{generated.subMessage}</p>
          </div>

          {/* FAQ (if applicable) */}
          {generated.faqMessage && (
            <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">▣ FAQ Message</span>
                <CopyBtn text={`Q. ${generated.faqMessage.q}\nA. ${generated.faqMessage.a}`} id="faq" />
              </div>
              <p className="text-sm font-medium mb-1">Q. {generated.faqMessage.q}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">A. {generated.faqMessage.a}</p>
            </div>
          )}

          {/* Inside vs Outside Versions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                  <Monitor className="h-3 w-3" /> Inside Channel
                </span>
                <CopyBtn text={generated.insideVersion} id="inside_ver" />
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/20 text-xs text-foreground/80 whitespace-pre-line">
                {generated.insideVersion}
              </div>
              <p className="text-[9px] text-muted-foreground italic">
                {t("USP-focused, numbers-driven, spec-based", "USP 중심, 숫자 기반, 스펙 중심")}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                  <Film className="h-3 w-3" /> Outside Channel
                </span>
                <CopyBtn text={generated.outsideVersion} id="outside_ver" />
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/20 text-xs text-foreground/80 whitespace-pre-line">
                {generated.outsideVersion}
              </div>
              <p className="text-[9px] text-muted-foreground italic">
                {t("Emotion-driven, 3s hook, lifestyle", "감성 중심, 3초 훅, 라이프스타일")}
              </p>
            </div>
          </div>

          {/* Image Guide */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                {t("Image Creation Guide", "이미지 제작 가이드")}
              </span>
              <CopyBtn text={generated.imageGuide} id="img_guide" />
            </div>
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground/80">
              {generated.imageGuide}
            </div>
          </div>

          {/* Export Prompts — Bridge to External Tools */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <ExternalLink className="h-4 w-4 text-primary" />
              {t("External Tool Prompts", "외부 툴 프롬프트")}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {t(
                "Copy the prompt and click the link to create images/videos in each tool",
                "프롬프트를 복사하고 링크를 클릭해 각 툴에서 이미지/영상을 제작하세요"
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {generated.exportPrompts.map((exp) => (
                <div key={exp.tool} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{exp.tool}</Badge>
                      {exp.url && (
                        <a href={exp.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                          <ExternalLink className="h-2.5 w-2.5" /> Open
                        </a>
                      )}
                    </div>
                    <CopyBtn text={exp.prompt} id={`exp_${exp.tool}`} />
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-muted/30 text-[11px] text-foreground/70 font-mono leading-relaxed">
                    {exp.prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Checklist */}
          <Collapsible open={showLegal} onOpenChange={setShowLegal}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
              {showLegal ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
              <span className="font-medium">{t("Full Compliance Checklist", "전체 컴플라이언스 체크리스트")}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 rounded-lg border border-border bg-secondary/20 text-[11px] space-y-1">
              {getComplianceChecks(selectedPurpose.channel === "outside" ? "social" : "dotcom").map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground font-mono">[{c.category}]</span>
                  <span className="text-foreground/80">{lang === "en" ? c.rule : c.ruleKo}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Full Prompt (copyable) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                📋 {t("Full Creation Brief", "전체 제작 브리프")}
              </h4>
              <CopyBtn text={generated.fullPrompt} id="full_prompt" label={t("Copy Brief", "브리프 복사")} />
            </div>
            <Textarea
              value={generated.fullPrompt}
              readOnly
              className="text-xs font-mono leading-relaxed min-h-[200px] bg-secondary/30"
            />
          </div>
        </div>
      )}
    </div>
  );
}
