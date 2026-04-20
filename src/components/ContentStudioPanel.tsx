import { useState, useMemo } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { findTvGuides } from "@/data/tvMarketingGuide";
import { toast } from "sonner";
import {
  Copy, Check, Wand2, ShieldCheck, AlertTriangle, CheckCircle2,
  Monitor, Image as ImageIcon, Film, FileText, Palette,
  ChevronDown, ChevronRight, Info,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LG_COMPONENT_SPECS,
  CONTENT_TYPES,
  LOCALES,
  TONALITY_OPTIONS,
  BANNER_IMAGE_STYLES,
  type ContentTypeKey,
  type BannerImageStyleKey,
} from "@/data/lgContentSpecs";
import { getComplianceChecks } from "@/lib/adComplianceRules";
import type { SentimentResult } from "@/lib/sentiment";
import type { MarketingOutput } from "@/lib/formatMessage";

interface ContentStudioPanelProps {
  productName: string;
  displayName: string;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string }[];
  marketing: MarketingOutput;
  initialCopy?: { headline: string; body: string; channel: "inside" | "outside" } | null;
}

interface GeneratedPrompt {
  contentType: string;
  finalPrompt: string;
  shortVersion: string;
  longVersion: string;
  visualGuidance: string;
  exportFormats: {
    midjourney: string;
    firefly: string;
    runway: string;
    canva: string;
  };
  legalReview: {
    status: "pass" | "needs_revision" | "fail";
    violations: string[];
  };
}

export function ContentStudioPanel({
  productName,
  displayName,
  sentiment,
  reviews,
  marketing: _marketing,
  initialCopy,
}: ContentStudioPanelProps) {
  const { t, lang } = useLang();
  const [contentType, setContentType] = useState<ContentTypeKey>("pdp_banner");
  const [channelType, setChannelType] = useState<"inside" | "outside">("inside");
  const [locale, setLocale] = useState("en-US");
  const [tonality, setTonality] = useState("technical");
  const [bannerStyle, setBannerStyle] = useState<BannerImageStyleKey>("product_solo");
  const [generated, setGenerated] = useState<GeneratedPrompt | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [linkedCopy, setLinkedCopy] = useState<{ headline: string; body: string } | null>(null);

  // Apply initialCopy when it changes (from Toolkit → Studio link)
  const [lastAppliedCopy, setLastAppliedCopy] = useState<typeof initialCopy>(null);
  if (initialCopy && initialCopy !== lastAppliedCopy) {
    setLastAppliedCopy(initialCopy);
    setChannelType(initialCopy.channel);
    setLinkedCopy({ headline: initialCopy.headline, body: initialCopy.body });
    setTonality("review_highlight");
    if (initialCopy.channel === "inside") {
      setContentType("pdp_banner");
    } else {
      setContentType("sns_card");
    }
    setGenerated(null);
  }

  const selectedContentType = CONTENT_TYPES.find((c) => c.key === contentType);
  const spec = selectedContentType?.spec
    ? LG_COMPONENT_SPECS.find((s) => s.id === selectedContentType.spec)
    : null;

  // Extract insights from sentiment
  const strengths = useMemo(() => {
    const phrases = sentiment.phrases?.positive || [];
    const kw = sentiment.keywords.positive || [];
    return phrases.length >= 3 ? phrases.slice(0, 5) : [...phrases, ...kw].slice(0, 5);
  }, [sentiment]);

  const painPoints = useMemo(() => {
    const neg = sentiment.keywords.negative || [];
    const negPhrases = sentiment.phrases?.negative || [];
    return negPhrases.length > 0 ? negPhrases.slice(0, 3) : neg.slice(0, 3);
  }, [sentiment]);

  const usingScenes = useMemo(() => {
    return (sentiment.usageScenes || []).slice(0, 6).map((s) => s.replace(/\s*\(\d+x\)$/, ""));
  }, [sentiment]);

  // Extract USP keywords for banner prompts
  const uspKeywords = useMemo(() => {
    const allPositive = [...(sentiment.phrases?.positive || []), ...(sentiment.keywords.positive || [])];
    return allPositive
      .filter((k) => k.length > 3 && k.length < 40)
      .slice(0, 8);
  }, [sentiment]);

  const total = sentiment.positive + sentiment.negative + sentiment.neutral;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(t("Copied to clipboard", "클립보드에 복사되었습니다"));
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const CopyBtn = ({ text, id, label }: { text: string; id: string; label?: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyText(text, id)}
      className="h-7 text-[10px] gap-1"
    >
      {copiedKey === id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      {label || t("Copy", "복사")}
    </Button>
  );

  // Run legal compliance checks
  const runLegalCheck = (prompt: string): { status: "pass" | "needs_revision" | "fail"; violations: string[] } => {
    const violations: string[] = [];
    const superlatives = ["best", "#1", "unprecedented", "most reliable", "top-rated", "number one", "world's first"];
    const comparatives = ["better than", "superior to", "beats", "outperforms", "compared to"];

    for (const s of superlatives) {
      if (prompt.toLowerCase().includes(s)) {
        violations.push(`[General #9] Unsubstantiated superlative found: "${s}" — remove or add verifiable evidence`);
      }
    }
    for (const c of comparatives) {
      if (prompt.toLowerCase().includes(c)) {
        violations.push(`[Comparative #31] Direct competitor comparison: "${c}" — remove or reframe`);
      }
    }
    if (channelType === "outside" && !prompt.toLowerCase().includes("ad") && !prompt.toLowerCase().includes("광고")) {
      violations.push(`[General #20] SNS/Outside channel content must include "Ad" / "광고" label`);
    }

    return {
      status: violations.length === 0 ? "pass" : violations.length <= 2 ? "needs_revision" : "fail",
      violations,
    };
  };

  const generatePrompt = () => {
    const ctLabel = selectedContentType
      ? lang === "en" ? selectedContentType.labelEn : selectedContentType.labelKo
      : contentType;
    const toneLabel = TONALITY_OPTIONS.find((t) => t.key === tonality);
    const localeLabel = LOCALES.find((l) => l.key === locale)?.label || locale;
    const chLabel = channelType === "inside" ? "Inside Channel (PDP/Email)" : "Outside Channel (SNS/YouTube/Display)";

    const strengthsList = strengths.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const painList = painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n");
    const sceneList = usingScenes.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const uspList = uspKeywords.map((k, i) => `${i + 1}. ${k}`).join("\n");
    const evidence = `Based on analysis of ${total} user reviews. Positive: ${sentiment.positive}, Negative: ${sentiment.negative}, Neutral: ${sentiment.neutral}. Avg score: ${(sentiment.averageScore * 100).toFixed(0)}/100.`;

    // Spec info
    const specInfo = spec
      ? `\n\n📐 LG.com Component Spec (${spec.id} - ${spec.name}):\n- Desktop: ${spec.desktopSize}\n- Mobile: ${spec.mobileSize}\n- Eyebrow: max ${spec.textLimits.eyebrow || "N/A"} chars\n- Headline: max ${spec.textLimits.headline || "N/A"} chars\n- Body: max ${spec.textLimits.body || "N/A"} chars\n- CTA: max ${spec.textLimits.cta || "N/A"} chars\n- Image format: ${spec.imageFormat.join(", ")}\n- Notes: ${spec.notes}`
      : "";

    const channelGuidance = channelType === "inside"
      ? "\n\n📌 Inside Channel Rules:\n- Fact-driven, feature-focused copy\n- No emotional language or storytelling\n- Technical specs and evidence-based claims\n- CTA leads to product page"
      : "\n\n📌 Outside Channel Rules:\n- Emotional, story-driven, problem-solving copy\n- Must include 'Ad' / '광고' label\n- Authentic tone, lifestyle imagery\n- CTA can lead to landing page or social engagement";

    const forbiddenPhrases = "\n\n🚫 Forbidden Phrases:\n- No superlatives without evidence: 'best', '#1', 'unprecedented'\n- No direct competitor comparisons\n- No unverified environmental claims\n- Must not mislead reasonable consumers";

    const productNameRule = `\n\n🎯 Product Name Usage (CRITICAL):\n- MINIMIZE explicit product/model name mentions in headlines and body copy.\n- Mention the full product name AT MOST ONCE per asset (only when essential — e.g. legal disclosure, first hero line, or CTA button).\n- Lead with BENEFITS, EMOTIONAL HOOKS, and PROOF POINTS — not the product name.\n- Prefer pronouns/category words ("it", "this OLED", "your fridge") or pure benefit framing instead of repeating the model name.\n- The persuasion must come from the strength/value/transformation, not from name recall.`;

    const mustInclude = `\n\n✅ Must Include:\n- Data source disclosure: "Based on ${total} user reviews"\n- Disclaimer reference (ST0010 footer area)\n- ${channelType === "outside" ? "'Ad' label for SNS content" : "Product page link"}`;

    const linkedSection = linkedCopy
      ? `\n\n🔗 Linked Copy from Toolkit (use as base):\n- Headline: ${linkedCopy.headline}\n- Body: ${linkedCopy.body}\n\n📌 Instruction: Use the above copy as the foundation. Adapt tone, length, and format to fit the selected content type while preserving the core message.`
      : "";

    const reviewHighlightNote = tonality === "review_highlight"
      ? `\n\n⭐ Review Highlight Tone:\n- Lead with real customer quotes and expressions\n- Use "Users say..." / "Customers love..." framing\n- Prioritize authentic voice over polished marketing language\n- Include star ratings or sentiment stats where appropriate`
      : "";

    // TV & webOS Sales-Com guide injection
    const tvGuides = findTvGuides(displayName || productName);
    const tvGuideSection = tvGuides.length > 0
      ? `\n\n📺 TV Sales-Com Marketing Guide (lg.com PDP 영어 표현 적용):\n${tvGuides.map(g => {
          const points = g.pdpPhrases.map((p, i) => `  ${i + 1}. ${p}`).join("\n");
          const voc = g.vocPatterns.map(v => `  - "${v}"`).join("\n");
          return `\n▸ ${g.label}:\n  [VOC Patterns]\n${voc}\n  [PDP Selling Points — use these English expressions]\n${points}`;
        }).join("\n")}\n\n📌 Instruction: Incorporate the above lg.com PDP English expressions into headlines and body copy. Address VOC pain points directly with the corresponding selling points.`
      : "";

    // Banner image style section for PDP banners
    const selectedBannerStyle = BANNER_IMAGE_STYLES.find((s) => s.key === bannerStyle);
    const bannerStyleSection = contentType === "pdp_banner" && selectedBannerStyle
      ? `\n\n🖼️ Banner Image Style: ${selectedBannerStyle.labelEn} (${selectedBannerStyle.labelKo})\n- ${selectedBannerStyle.descEn}\n${
        bannerStyle === "lifestyle_cut"
          ? `- Scene references from reviews: ${usingScenes.slice(0, 3).join(", ") || "modern living space"}\n- Show product naturally integrated into customer's real-life environment\n- Warm, inviting atmosphere — NOT studio shot\n- Customer-validated usage context makes imagery more relatable`
          : bannerStyle === "usp_feature"
          ? `- Key USP from reviews: "${strengths[0] || "Quality"}"\n- Close-up or macro detail shot emphasizing the differentiating feature\n- Technical precision with dramatic lighting\n- Overlay-ready composition with clear text area`
          : bannerStyle === "before_after"
          ? `- Problem (from pain points): "${painPoints[0] || "common frustration"}"\n- Solution: Product as the hero resolving this pain point\n- Split/comparison composition or sequence flow\n- Clear visual transformation narrative`
          : bannerStyle === "promo_highlight"
          ? `- Promotional badge/sticker overlay area reserved\n- Product at center with space for offer callout\n- High contrast, attention-grabbing composition\n- Clear hierarchy: Offer → Product → CTA`
          : `- Clean studio/gradient background\n- Product hero shot at center-right\n- Generous text area on left for copy overlay\n- Focus on product design, form factor, premium finish`
      }`
      : "";

    // Enhanced USP & keyword section
    const uspSection = uspKeywords.length > 0
      ? `\n\n🔑 USP Keywords (from customer reviews):\n${uspList}\n📌 Use these authentic customer expressions in headlines and body copy for higher relatability.`
      : "";

    const finalPrompt = `🎯 Objective: Create ${ctLabel} for ${displayName || productName}
📍 Target: ${localeLabel} consumers via ${chLabel}
🎨 Tone & Manner: ${toneLabel ? (lang === "en" ? toneLabel.labelEn : toneLabel.labelKo) : tonality}

── Review-Driven Insights ──

💪 Core Strengths (Top ${strengths.length}):
${strengthsList || "N/A"}

🔧 Pain Point Resolution Messages:
${painList || "N/A"}

🏠 Real Using Scenes (Top ${usingScenes.length}):
${sceneList || "N/A"}
${uspSection}

📊 Evidence:
${evidence}
${specInfo}${bannerStyleSection}
${channelGuidance}
${forbiddenPhrases}${productNameRule}
${mustInclude}${linkedSection}${reviewHighlightNote}${tvGuideSection}`;

    // Generate visual guidance based on content type + banner style
    let visualGuidance = "";
    switch (contentType) {
      case "pdp_banner": {
        const baseSpec = `Desktop: ${spec?.desktopSize || "1920×720"}. Mobile: ${spec?.mobileSize || "720×960"}. No text in image — overlay via AEM component.`;
        switch (bannerStyle) {
          case "lifestyle_cut":
            visualGuidance = `Lifestyle photography: Product naturally placed in ${usingScenes[0] || "a modern living room"}. Warm natural lighting, real-home atmosphere. ${baseSpec} Show product being used/enjoyed — NOT posed. Scene inspired by customer review: "${strengths[0] || "everyday convenience"}".`;
            break;
          case "usp_feature":
            visualGuidance = `Feature close-up: Dramatic macro/detail shot highlighting "${strengths[0] || "key feature"}". Dark gradient or clean background. Precision lighting to emphasize texture/technology. ${baseSpec} Product detail at 60-70% frame, text area on opposite side.`;
            break;
          case "before_after":
            visualGuidance = `Split composition: Left side shows problem scenario ("${painPoints[0] || "frustration"}"), right side shows solution with product. Clear visual transformation. ${baseSpec} Divider line or gradient transition between halves.`;
            break;
          case "promo_highlight":
            visualGuidance = `Product hero on clean gradient. Space reserved for promotional badge/sticker (top-right or corner). High-contrast composition. ${baseSpec} Product at center-right, promo callout area top-left, CTA bottom-left.`;
            break;
          default:
            visualGuidance = `Clean product hero shot on dark gradient or studio background. ${baseSpec} Product at center-right, text area left. Premium finish, studio lighting.`;
        }
        break;
      }
      case "pdp_feature":
        visualGuidance = `Split layout — product detail shot on one side, feature text on other. Highlight the primary strength: "${strengths[0] || "Quality"}". Close-up detail shots for key features.`;
        break;
      case "sns_card":
        visualGuidance = `Square (1080×1080) or vertical (1080×1350) card. Bold headline text overlay. Product lifestyle shot in ${usingScenes[0] || "living room"} setting. Brand color accent. Must include "Ad" watermark.`;
        break;
      case "youtube_script":
        visualGuidance = `Vertical 9:16 (1080×1920) for Shorts. Hook in first 3 seconds. Show product in real ${usingScenes[0] || "use"} scenario. Text overlay for key claims. End with CTA + product shot.`;
        break;
      case "blog_review":
        visualGuidance = `Header hero image 1200×630. Mix of product shots and lifestyle images. Infographic for review sentiment breakdown. Quote cards for user testimonials.`;
        break;
      case "ab_copy":
        visualGuidance = `Same visual, 2-3 headline variations. A: Feature-led. B: Benefit-led. C: Pain-point resolution. Track CTR and conversion.`;
        break;
      case "brand_story":
        visualGuidance = `Cinematic lifestyle imagery. Product integrated naturally into ${usingScenes[0] || "daily life"} scene. Warm, aspirational color grading. 16:9 for desktop, 9:16 for mobile stories.`;
        break;
    }

    // Short version for quick use — benefit-led, product name de-emphasized
    const shortVersion = `${strengths[0] || "Quality you feel"}. ${strengths[1] || "Performance you trust"}. ${channelType === "outside" ? "[Ad] " : ""}${usingScenes[0] ? `Made for ${usingScenes[0]}.` : "Experience it yourself."}`;

    // Long version for detailed content — benefit-led, single product mention max
    const longVersion = `Users highlight ${strengths.join(", ")} as standout strengths. ${painPoints.length > 0 ? `Designed to address ${painPoints[0]}, ` : ""}real customers describe their experience in ${usingScenes.join(", ") || "everyday settings"}. ${evidence}`;

    // Export formats — adapt to banner style
    const styleScene = bannerStyle === "lifestyle_cut" ? (usingScenes[0] || "modern living room") : bannerStyle === "usp_feature" ? "detail close-up" : (usingScenes[0] || "studio");
    const styleMood = bannerStyle === "lifestyle_cut" ? "warm lifestyle, natural light" : bannerStyle === "usp_feature" ? "dramatic, precision macro" : bannerStyle === "before_after" ? "split composition, transformation" : `${tonality} mood`;
    const mjPrompt = `${displayName || productName} product photography, ${styleMood}, ${styleScene} setting, professional lighting, 8k, photorealistic --ar ${contentType === "pdp_banner" ? "8:3" : contentType === "sns_card" ? "1:1" : "16:9"} --v 6`;
    const fireflyPrompt = `Professional ${bannerStyle === "lifestyle_cut" ? "lifestyle" : "product"} shot of ${displayName || productName} in ${styleScene} environment. Style: ${tonality}. Lighting: ${bannerStyle === "lifestyle_cut" ? "natural, warm" : "studio"}. Background: ${bannerStyle === "lifestyle_cut" ? "real home environment" : tonality === "technical" ? "dark gradient" : "clean studio"}.`;
    const runwayPrompt = `Slow reveal of ${displayName || productName} in ${styleScene}. Camera: ${bannerStyle === "lifestyle_cut" ? "slow pan across room" : "dolly in"}. Duration: 5s. Style: ${tonality}, cinematic. End frame: ${bannerStyle === "lifestyle_cut" ? "product in context, lifestyle moment" : `product hero shot with feature highlight "${strengths[0] || "quality"}"`}.`;
    const canvaPrompt = `Template: ${contentType === "sns_card" ? "Instagram Post" : contentType === "pdp_banner" ? "Website Banner" : "Presentation"}. Brand: LG Electronics. Colors: #A50034 (LG Red), #1A1A1A. Headline: "${shortVersion}". Image: ${bannerStyle === "lifestyle_cut" ? "lifestyle photography" : "product hero"}.`;

    const legal = runLegalCheck(finalPrompt + shortVersion + longVersion);

    setGenerated({
      contentType: ctLabel,
      finalPrompt,
      shortVersion,
      longVersion,
      visualGuidance,
      exportFormats: {
        midjourney: mjPrompt,
        firefly: fireflyPrompt,
        runway: runwayPrompt,
        canva: canvaPrompt,
      },
      legalReview: legal,
    });
  };

  if (reviews.length < 3) return null;

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <Palette className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold font-heading">
          {t("Review-Driven Content Studio", "리뷰 드리븐 컨텐츠 스튜디오")}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          "Generate content creation prompts from review insights — ready for Midjourney, Firefly, Runway, Canva and more.",
          "리뷰 인사이트에서 콘텐츠 제작 프롬프트를 자동 생성합니다 — Midjourney, Firefly, Runway, Canva 등에서 바로 사용 가능합니다."
        )}
      </p>

      {/* Channel → Content Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Inside Channel */}
        <div className={`rounded-xl border-2 p-4 space-y-3 transition-all cursor-pointer ${
          channelType === "inside"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border bg-secondary/10 hover:border-primary/30"
        }`}
          onClick={() => {
            setChannelType("inside");
            if (!["pdp_banner", "pdp_feature"].includes(contentType)) setContentType("pdp_banner");
          }}
        >
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Inside Channel</p>
              <p className="text-[10px] text-muted-foreground">LG.com PDP / Email / Paid Search</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { key: "pdp_banner" as ContentTypeKey, icon: "🖼️", en: "PDP Banner (Hero)", ko: "PDP 배너 히어로" },
              { key: "pdp_feature" as ContentTypeKey, icon: "📐", en: "PDP Feature Block", ko: "PDP 피처 블록" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={(e) => { e.stopPropagation(); setChannelType("inside"); setContentType(item.key); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium border transition-all ${
                  contentType === item.key && channelType === "inside"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-foreground/80 hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <span>{item.icon}</span>
                {lang === "en" ? item.en : item.ko}
              </button>
            ))}
          </div>
          {/* Banner Image Style - only for PDP Banner */}
          {channelType === "inside" && contentType === "pdp_banner" && (
            <div className="space-y-1.5 mt-2">
              <p className="text-[10px] font-medium text-muted-foreground">
                {t("Image Style", "이미지 스타일")}
              </p>
              <div className="grid grid-cols-1 gap-1">
                {BANNER_IMAGE_STYLES.map((style) => (
                  <button
                    key={style.key}
                    onClick={(e) => { e.stopPropagation(); setBannerStyle(style.key as BannerImageStyleKey); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] border transition-all ${
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
          <p className="text-[10px] text-muted-foreground italic">
            {t("Fact-driven, spec-focused. LG.com CCG compliant.", "팩트 중심, 스펙 중심. LG.com CCG 준수.")}
          </p>
        </div>

        {/* Outside Channel */}
        <div className={`rounded-xl border-2 p-4 space-y-3 transition-all cursor-pointer ${
          channelType === "outside"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border bg-secondary/10 hover:border-primary/30"
        }`}
          onClick={() => {
            setChannelType("outside");
            if (["pdp_banner", "pdp_feature"].includes(contentType)) setContentType("sns_card");
          }}
        >
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Outside Channel</p>
              <p className="text-[10px] text-muted-foreground">SNS / YouTube / Display / Blog</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { key: "sns_card" as ContentTypeKey, icon: "📱", en: "SNS Card / Image", ko: "SNS 카드/이미지" },
              { key: "youtube_script" as ContentTypeKey, icon: "🎬", en: "YouTube Script (Shorts)", ko: "유튜브 스크립트 (쇼츠)" },
              { key: "blog_review" as ContentTypeKey, icon: "📝", en: "Blog Review", ko: "블로그 리뷰" },
              { key: "ab_copy" as ContentTypeKey, icon: "🔀", en: "A/B Test Copy Set", ko: "A/B 테스트 카피 세트" },
              { key: "brand_story" as ContentTypeKey, icon: "✨", en: "Brand Storytelling", ko: "브랜드 스토리텔링" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={(e) => { e.stopPropagation(); setChannelType("outside"); setContentType(item.key); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium border transition-all ${
                  contentType === item.key && channelType === "outside"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-foreground/80 hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <span>{item.icon}</span>
                {lang === "en" ? item.en : item.ko}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            {t("Emotion-driven, story-led. 'Ad' label required.", "감성/스토리 중심. '광고' 표기 필수.")}
          </p>
        </div>
      </div>

      {/* Locale & Tonality — compact row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Locale</label>
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
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("Tone & Manner", "톤앤매너")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TONALITY_OPTIONS.map((tn) => (
              <button
                key={tn.key}
                onClick={() => setTonality(tn.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                  tonality === tn.key
                    ? "bg-primary border-primary/50 text-primary-foreground"
                    : "bg-background border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {lang === "en" ? tn.labelEn : tn.labelKo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LG.com Spec Reference */}
      {spec && (
        <Collapsible open={showSpecs} onOpenChange={setShowSpecs}>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
            {showSpecs ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Monitor className="h-3.5 w-3.5" />
            <span className="font-medium">{t("LG.com Component Spec", "LG.com 컴포넌트 스펙")}: {spec.id}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 rounded-lg border border-border bg-secondary/20 text-xs space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Desktop:</span> <span className="font-mono">{spec.desktopSize}</span></div>
              <div><span className="text-muted-foreground">Mobile:</span> <span className="font-mono">{spec.mobileSize}</span></div>
              {spec.textLimits.eyebrow && <div><span className="text-muted-foreground">Eyebrow:</span> max {spec.textLimits.eyebrow} chars</div>}
              {spec.textLimits.headline && <div><span className="text-muted-foreground">Headline:</span> max {spec.textLimits.headline} chars</div>}
              {spec.textLimits.body && <div><span className="text-muted-foreground">Body:</span> max {spec.textLimits.body} chars</div>}
              {spec.textLimits.cta && <div><span className="text-muted-foreground">CTA:</span> max {spec.textLimits.cta} chars</div>}
            </div>
            <p className="text-muted-foreground mt-1"><Info className="h-3 w-3 inline mr-1" />{spec.notes}</p>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Linked Copy from Toolkit */}
      {linkedCopy && (
        <div className="p-3 rounded-lg border-2 border-accent bg-accent/10 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-accent-foreground text-[11px] flex items-center gap-1.5">
              🔗 {t("Linked from Toolkit", "툴킷에서 연동됨")}
            </p>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setLinkedCopy(null)}>
              ✕ {t("Clear", "해제")}
            </Button>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground"><span className="font-medium">Headline:</span> {linkedCopy.headline}</p>
            <p className="text-muted-foreground"><span className="font-medium">Body:</span> {linkedCopy.body}</p>
          </div>
        </div>
      )}

      {/* Insights Preview */}
      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2 text-xs">
        <p className="font-semibold text-primary text-[11px]">
          {t("Review Insights to be included", "프롬프트에 포함될 리뷰 인사이트")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <span className="text-muted-foreground">💪 Strengths:</span>
            <p className="text-foreground/80">{strengths.join(", ") || "N/A"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">🔧 Pain Points:</span>
            <p className="text-foreground/80">{painPoints.join(", ") || "N/A"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">🏠 Using Scenes:</span>
            <p className="text-foreground/80">{usingScenes.join(", ") || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <Button onClick={generatePrompt} className="w-full gap-2">
        <Wand2 className="h-4 w-4" />
        {t("Generate Content Prompt", "콘텐츠 프롬프트 생성")}
      </Button>

      {/* Generated Result */}
      {generated && (
        <div className="space-y-4">
          {/* Legal Review Status */}
          <div className={`p-3 rounded-lg border ${
            generated.legalReview.status === "pass"
              ? "border-success/30 bg-success/10"
              : generated.legalReview.status === "needs_revision"
              ? "border-yellow-500/30 bg-yellow-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {generated.legalReview.status === "pass" ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm font-medium">
                {t("Legal Compliance", "법무 컴플라이언스")}:
                <Badge variant="outline" className={`ml-2 text-[10px] ${
                  generated.legalReview.status === "pass" ? "text-success border-success/30" : "text-yellow-500 border-yellow-500/30"
                }`}>
                  {generated.legalReview.status.toUpperCase()}
                </Badge>
              </span>
            </div>
            {generated.legalReview.violations.length > 0 && (
              <ul className="text-xs text-foreground/80 space-y-1 mt-2">
                {generated.legalReview.violations.map((v, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                    {v}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Compliance Checklist */}
          <Collapsible open={showLegal} onOpenChange={setShowLegal}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
              {showLegal ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              <span className="font-medium">{t("Full Compliance Checklist", "전체 컴플라이언스 체크리스트")}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 rounded-lg border border-border bg-secondary/20 text-[11px] space-y-1">
              {getComplianceChecks(channelType === "outside" ? "social" : "dotcom").map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="text-muted-foreground font-mono">[{c.category}]</span>
                  <span className="text-foreground/80">{lang === "en" ? c.rule : c.ruleKo}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Final Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                {t("Final Prompt", "최종 프롬프트")}
              </h4>
              <CopyBtn text={generated.finalPrompt} id="final_prompt" label={t("Copy Prompt", "프롬프트 복사")} />
            </div>
            <Textarea
              value={generated.finalPrompt}
              readOnly
              className="text-xs font-mono leading-relaxed min-h-[200px] bg-secondary/30"
            />
          </div>

          {/* Short & Long Versions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/80">{t("Short Version", "짧은 버전")}</span>
                <CopyBtn text={generated.shortVersion} id="short_ver" />
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/20 text-xs text-foreground/80">
                {generated.shortVersion}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/80">{t("Long Version", "긴 버전")}</span>
                <CopyBtn text={generated.longVersion} id="long_ver" />
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/20 text-xs text-foreground/80">
                {generated.longVersion}
              </div>
            </div>
          </div>

          {/* Visual Guidance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                {t("Visual Guidance", "비주얼 가이드")}
              </span>
              <CopyBtn text={generated.visualGuidance} id="visual" />
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/20 text-xs text-foreground/80">
              {generated.visualGuidance}
            </div>
          </div>

          {/* Export Formats */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Film className="h-4 w-4 text-primary" />
              {t("Export-Ready Prompts", "외부 툴용 프롬프트")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(generated.exportFormats).map(([tool, prompt]) => (
                <div key={tool} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] capitalize">{tool}</Badge>
                    <CopyBtn text={prompt} id={`export_${tool}`} />
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-muted/30 text-[11px] text-foreground/70 font-mono leading-relaxed">
                    {prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
