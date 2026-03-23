/**
 * LG.com GP1 Content Creation Guideline v1.5.5 — Key Specs
 * Extracted from the official CCG document for Content Studio prompt generation.
 */

export interface ComponentSpec {
  id: string;
  name: string;
  desktopSize: string;
  mobileSize: string;
  textLimits: {
    eyebrow?: number;
    headline?: number;
    body?: number;
    cta?: number;
  };
  imageFormat: string[];
  notes: string;
}

export const LG_COMPONENT_SPECS: ComponentSpec[] = [
  {
    id: "ST0001",
    name: "Hero Image (Default)",
    desktopSize: "1920 × 720px",
    mobileSize: "720 × 960px",
    textLimits: { eyebrow: 40, headline: 50, body: 340, cta: 35 },
    imageFormat: ["JPG", "PNG", "GIF"],
    notes: "Disclaimer must be placed in footer (ST0010), not in image. Carousel UI must not overlap.",
  },
  {
    id: "ST0001-narrow",
    name: "Hero Image (Narrow)",
    desktopSize: "1600 × 720px",
    mobileSize: "720 × 960px",
    textLimits: { eyebrow: 40, headline: 50, body: 340, cta: 35 },
    imageFormat: ["JPG", "PNG", "GIF"],
    notes: "Narrower variant for medium-width layouts.",
  },
  {
    id: "ST0001-small",
    name: "Hero Image (Small)",
    desktopSize: "1440 × 600px",
    mobileSize: "720 × 960px",
    textLimits: { eyebrow: 40, headline: 50, body: 340, cta: 35 },
    imageFormat: ["JPG", "PNG", "GIF"],
    notes: "Compact hero for category pages.",
  },
  {
    id: "ST0004",
    name: "Block Image – Text Overlay",
    desktopSize: "1440px × Flexible",
    mobileSize: "720 × 480px",
    textLimits: { headline: 50, body: 250, cta: 35 },
    imageFormat: ["JPG", "PNG"],
    notes: "Text overlay on block image.",
  },
  {
    id: "ST0013",
    name: "Side Image",
    desktopSize: "1600px × Flexible",
    mobileSize: "768px × Flexible",
    textLimits: { headline: 50, body: 250, cta: 35 },
    imageFormat: ["JPG", "PNG"],
    notes: "Image on one side, text on other.",
  },
  {
    id: "ST0016",
    name: "Image - Text (Folding Feature)",
    desktopSize: "1440px × Flexible",
    mobileSize: "720 × 560px",
    textLimits: { headline: 50, body: 250, cta: 35 },
    imageFormat: ["JPG", "PNG"],
    notes: "Foldable content area with open/close button.",
  },
  {
    id: "PD0046",
    name: "Product Content",
    desktopSize: "1440px × Flexible",
    mobileSize: "720 × 480px",
    textLimits: { headline: 50, body: 340, cta: 35 },
    imageFormat: ["JPG", "PNG"],
    notes: "Product detail content block. Max 6 subtitle categories.",
  },
];

export const CONTENT_TYPES = [
  { key: "pdp_banner", labelEn: "PDP Banner (Hero)", labelKo: "PDP 배너 (히어로)", spec: "ST0001" },
  { key: "pdp_feature", labelEn: "PDP Feature Block", labelKo: "PDP 피처 블록", spec: "ST0013" },
  { key: "sns_card", labelEn: "SNS Card / Image", labelKo: "SNS 카드/이미지", spec: null },
  { key: "blog_review", labelEn: "Blog Review", labelKo: "블로그 리뷰", spec: null },
  { key: "youtube_script", labelEn: "YouTube Script (Shorts)", labelKo: "유튜브 스크립트 (쇼츠)", spec: null },
  { key: "ab_copy", labelEn: "A/B Test Copy Set", labelKo: "A/B 테스트 카피 세트", spec: null },
  { key: "brand_story", labelEn: "Brand Storytelling", labelKo: "브랜드 스토리텔링", spec: null },
] as const;

export type ContentTypeKey = typeof CONTENT_TYPES[number]["key"];

export const CHANNEL_TYPES = [
  { key: "inside", labelEn: "Inside Channel", labelKo: "Inside Channel", desc: "PDP / Paid Search / Email" },
  { key: "outside", labelEn: "Outside Channel", labelKo: "Outside Channel", desc: "SNS / YouTube / Display" },
] as const;

export const LOCALES = [
  { key: "en-US", label: "English (US)" },
  { key: "en-UK", label: "English (UK)" },
  { key: "de-DE", label: "Deutsch" },
  { key: "fr-FR", label: "Français" },
  { key: "pt-BR", label: "Português (BR)" },
  { key: "ko-KR", label: "한국어" },
] as const;

export const TONALITY_OPTIONS = [
  { key: "technical", labelEn: "Technical", labelKo: "기술 중심" },
  { key: "aspirational", labelEn: "Aspirational", labelKo: "영감 중심" },
  { key: "promotional", labelEn: "Promotional", labelKo: "프로모션형" },
  { key: "emotional", labelEn: "Emotional", labelKo: "감성형" },
  { key: "playful", labelEn: "Playful", labelKo: "캐주얼" },
] as const;
