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
  { key: "review_highlight", labelEn: "Review Highlight", labelKo: "리뷰 강조형" },
  { key: "aspirational", labelEn: "Aspirational", labelKo: "영감 중심" },
  { key: "promotional", labelEn: "Promotional", labelKo: "프로모션형" },
  { key: "emotional", labelEn: "Emotional", labelKo: "감성형" },
  { key: "playful", labelEn: "Playful", labelKo: "캐주얼" },
] as const;

/** Banner image style options for lg.com PDP banners */
export const BANNER_IMAGE_STYLES = [
  {
    key: "product_solo",
    labelEn: "Product Solo",
    labelKo: "제품 단독 노출",
    icon: "📦",
    descEn: "Clean product hero shot on gradient/studio background. Focus on design & form factor.",
    descKo: "그라데이션/스튜디오 배경에 제품 단독 노출. 디자인과 폼팩터 강조.",
  },
  {
    key: "promo_highlight",
    labelEn: "Promo Highlight",
    labelKo: "프로모션 강조형",
    icon: "🏷️",
    descEn: "Product with promotional badge/overlay (cashback, bundle deal, limited offer).",
    descKo: "프로모션 배지/오버레이와 함께 노출 (캐시백, 번들 딜, 한정 혜택).",
  },
  {
    key: "lifestyle_cut",
    labelEn: "Lifestyle Cut",
    labelKo: "라이프스타일 컷",
    icon: "🏠",
    descEn: "Product naturally integrated into real-life usage scene from customer reviews.",
    descKo: "고객 리뷰에서 추출한 실제 사용 상황에 자연스럽게 배치된 제품.",
  },
  {
    key: "usp_feature",
    labelEn: "USP Feature Focus",
    labelKo: "USP 기능 강조형",
    icon: "⚡",
    descEn: "Close-up or detail shot highlighting the key differentiator mentioned in reviews.",
    descKo: "리뷰에서 언급된 핵심 차별화 기능을 클로즈업/디테일 샷으로 강조.",
  },
  {
    key: "before_after",
    labelEn: "Before & After",
    labelKo: "비포&애프터",
    icon: "🔄",
    descEn: "Split composition showing problem → solution with the product as hero.",
    descKo: "문제 → 해결의 스플릿 구성. 제품이 솔루션 히어로로 등장.",
  },
] as const;

export type BannerImageStyleKey = typeof BANNER_IMAGE_STYLES[number]["key"];
