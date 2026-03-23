import { useState, useMemo } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  CHANNEL_TYPES,
  LOCALES,
  TONALITY_OPTIONS,
  type ContentTypeKey,
} from "@/data/lgContentSpecs";
import { getComplianceChecks, type ComplianceCheck } from "@/lib/adComplianceRules";
import type { SentimentResult } from "@/lib/sentiment";
import type { MarketingOutput } from "@/lib/formatMessage";

interface ContentStudioPanelProps {
  productName: string;
  displayName: string;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string }[];
  marketing: MarketingOutput;
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
  marketing,
}: ContentStudioPanelProps) {
  const { t, lang } = useLang();
  const [contentType, setContentType] = useState<ContentTypeKey>("pdp_banner");
  const [channelType, setChannelType] = useState<"inside" | "outside">("inside");
  const [locale, setLocale] = useState("en-US");
  const [tonality, setTonality] = useState("technical");
  const [generated, setGenerated] = useState<GeneratedPrompt | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  const selectedContentType = CONTENT_TYPES.find((c) => c.key === contentType);
  const spec = selectedContentType?.spec
    ? LG_COMPONENT_SPECS.find((s) => s.id === selectedContentType.spec)
    : null;

  // Extract insights from sentiment
  const strengths = useMemo(() => {
    const phrases = sentiment.phrases?.positive || [];
    const kw = sentiment.keywords.positive || [];
    return phrases.length >= 3 ? phrases.slice(0, 3) : [...phrases, ...kw].slice(0, 3);
  }, [sentiment]);

  const painPoints = useMemo(() => {
    const neg = sentiment.keywords.negative || [];
    const negPhrases = sentiment.phrases?.negative || [];
    return negPhrases.length > 0 ? negPhrases.slice(0, 2) : neg.slice(0, 2);
  }, [sentiment]);

  const usingScenes = useMemo(() => {
    return (sentiment.usageScenes || []).slice(0, 4).map((s) => s.replace(/\s*\(\d+x\)$/, ""));
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
      {copiedKey === id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
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
    const evidence = `Based on analysis of ${total} user reviews. Positive: ${sentiment.positive}, Negative: ${sentiment.negative}, Neutral: ${sentiment.neutral}. Avg score: ${(sentiment.averageScore * 100).toFixed(0)}/100.`;

    // Spec info
    const specInfo = spec
      ? `\n\n📐 LG.com Component Spec (${spec.id} - ${spec.name}):\n- Desktop: ${spec.desktopSize}\n- Mobile: ${spec.mobileSize}\n- Eyebrow: max ${spec.textLimits.eyebrow || "N/A"} chars\n- Headline: max ${spec.textLimits.headline || "N/A"} chars\n- Body: max ${spec.textLimits.body || "N/A"} chars\n- CTA: max ${spec.textLimits.cta || "N/A"} chars\n- Image format: ${spec.imageFormat.join(", ")}\n- Notes: ${spec.notes}`
      : "";

    const channelGuidance = channelType === "inside"
      ? "\n\n📌 Inside Channel Rules:\n- Fact-driven, feature-focused copy\n- No emotional language or storytelling\n- Technical specs and evidence-based claims\n- CTA leads to product page"
      : "\n\n📌 Outside Channel Rules:\n- Emotional, story-driven, problem-solving copy\n- Must include 'Ad' / '광고' label\n- Authentic tone, lifestyle imagery\n- CTA can lead to landing page or social engagement";

    const forbiddenPhrases = "\n\n🚫 Forbidden Phrases:\n- No superlatives without evidence: 'best', '#1', 'unprecedented'\n- No direct competitor comparisons\n- No unverified environmental claims\n- Must not mislead reasonable consumers";

    const mustInclude = `\n\n✅ Must Include:\n- Data source disclosure: "Based on ${total} user reviews"\n- Disclaimer reference (ST0010 footer area)\n- ${channelType === "outside" ? "'Ad' label for SNS content" : "Product page link"}`;

    const finalPrompt = `🎯 Objective: Create ${ctLabel} for ${displayName || productName}
📍 Target: ${localeLabel} consumers via ${chLabel}
🎨 Tone & Manner: ${toneLabel ? (lang === "en" ? toneLabel.labelEn : toneLabel.labelKo) : tonality}

── Review-Driven Insights ──

💪 Core Strengths (Top 3):
${strengthsList || "N/A"}

🔧 Pain Point Resolution Messages:
${painList || "N/A"}

🏠 Real Using Scenes (Top ${usingScenes.length}):
${sceneList || "N/A"}

📊 Evidence:
${evidence}
${specInfo}
${channelGuidance}
${forbiddenPhrases}
${mustInclude}`;

    // Generate visual guidance based on content type
    let visualGuidance = "";
    switch (contentType) {
      case "pdp_banner":
        visualGuidance = `Product hero shot on ${tonality === "technical" ? "clean dark/gradient" : "lifestyle"} background. Desktop: ${spec?.desktopSize || "1920×720"}. Mobile: ${spec?.mobileSize || "720×960"}. Product at center-right, text area left. No text in image — overlay via AEM component.`;
        break;
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

    // Short version for quick use
    const shortVersion = `${displayName || productName} — ${strengths[0] || "Quality"}. ${strengths[1] || "Performance"}. ${channelType === "outside" ? "[Ad] " : ""}${usingScenes[0] ? `Perfect for ${usingScenes[0]}.` : "Experience it yourself."}`;

    // Long version for detailed content
    const longVersion = `${displayName || productName}: Users highlight ${strengths.join(", ")} as standout features. ${painPoints.length > 0 ? `Addressing concerns like ${painPoints[0]}, ` : ""}real users describe their experience in ${usingScenes.join(", ") || "everyday settings"}. ${evidence}`;

    // Export formats
    const mjPrompt = `${displayName || productName} product photography, ${tonality} mood, ${usingScenes[0] || "studio"} setting, professional lighting, 8k, photorealistic --ar ${contentType === "pdp_banner" ? "8:3" : contentType === "sns_card" ? "1:1" : "16:9"} --v 6`;
    const fireflyPrompt = `Professional product shot of ${displayName || productName} in ${usingScenes[0] || "modern"} environment. Style: ${tonality}. Lighting: studio. Background: ${tonality === "technical" ? "dark gradient" : "lifestyle setting"}.`;
    const runwayPrompt = `Slow reveal of ${displayName || productName} in ${usingScenes[0] || "a modern home"}. Camera: dolly in. Duration: 5s. Style: ${tonality}, cinematic. End frame: product hero shot with feature highlight "${strengths[0] || "quality"}".`;
    const canvaPrompt = `Template: ${contentType === "sns_card" ? "Instagram Post" : contentType === "pdp_banner" ? "Website Banner" : "Presentation"}. Brand: LG Electronics. Colors: #A50034 (LG Red), #1A1A1A. Headline: "${shortVersion}". Image: product lifestyle.`;

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

      {/* Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Content Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("Content Type", "콘텐츠 유형")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.key}
                onClick={() => setContentType(ct.key)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                  contentType === ct.key
                    ? "bg-primary border-primary/50 text-primary-foreground"
                    : "bg-background border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {lang === "en" ? ct.labelEn : ct.labelKo}
              </button>
            ))}
          </div>
        </div>

        {/* Channel Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("Channel", "채널")}
          </label>
          <div className="flex gap-2">
            {CHANNEL_TYPES.map((ch) => (
              <button
                key={ch.key}
                onClick={() => setChannelType(ch.key as "inside" | "outside")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all text-left ${
                  channelType === ch.key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/20 hover:border-primary/30"
                }`}
              >
                <span className={channelType === ch.key ? "text-primary" : "text-foreground/80"}>
                  {lang === "en" ? ch.labelEn : ch.labelKo}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{ch.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Locale */}
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

        {/* Tonality */}
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
              ? "border-green-500/30 bg-green-500/10"
              : generated.legalReview.status === "needs_revision"
              ? "border-yellow-500/30 bg-yellow-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {generated.legalReview.status === "pass" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm font-medium">
                {t("Legal Compliance", "법무 컴플라이언스")}:
                <Badge variant="outline" className={`ml-2 text-[10px] ${
                  generated.legalReview.status === "pass" ? "text-green-500 border-green-500/30" : "text-yellow-500 border-yellow-500/30"
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
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
              <span className="font-medium">{t("Full Compliance Checklist", "전체 컴플라이언스 체크리스트")}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 rounded-lg border border-border bg-secondary/20 text-[11px] space-y-1">
              {getComplianceChecks(channelType === "outside" ? "social" : "dotcom").map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
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
