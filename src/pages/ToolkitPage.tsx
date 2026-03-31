import { useState, useMemo, useCallback, useEffect } from "react";
import { ExternalLink, Loader2, Wrench, Search, X, Image, LayoutTemplate, Sparkles, Target, Users, MapPin, Star, Eye, MousePointer, ShoppingCart, RefreshCw, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { analyzeSentiment } from "@/lib/sentiment";

// ═══════════════════════════════════════════════════════════════
//  AD FUNNEL / PURPOSE
// ═══════════════════════════════════════════════════════════════

const AD_FUNNELS = [
  { key: "awareness", icon: <Eye className="h-4 w-4" />, emoji: "👁️", labelEn: "Awareness", labelKo: "인지도 제고", descEn: "Brand awareness, reach, impressions — top of funnel", descKo: "브랜드 인지도, 도달, 노출 — 상위 퍼널" },
  { key: "consideration", icon: <MousePointer className="h-4 w-4" />, emoji: "🔍", labelEn: "Traffic & Consideration", labelKo: "방문 유도 & 고려", descEn: "Site visits, product page views, engagement", descKo: "사이트 방문, 상세페이지 조회, 인게이지먼트" },
  { key: "conversion", icon: <ShoppingCart className="h-4 w-4" />, emoji: "🛒", labelEn: "Purchase Conversion", labelKo: "구매 전환", descEn: "Add to cart, checkout, purchase — bottom of funnel", descKo: "장바구니 담기, 결제, 구매 — 하위 퍼널" },
  { key: "retention", icon: <RefreshCw className="h-4 w-4" />, emoji: "🔁", labelEn: "Retention & Repurchase", labelKo: "재구매 & 리텐션", descEn: "Loyalty, cross-sell, upsell, repeat purchase", descKo: "로열티, 크로스셀, 업셀, 반복 구매" },
];

// ═══════════════════════════════════════════════════════════════
//  STATIC DATA (kept from original)
// ═══════════════════════════════════════════════════════════════

const OWNED_COPY = {
  bullets: {
    label: "📄 PDP Feature Highlights — Bullet Points",
    meta: "LG.com PDP · Max 5 bullets",
    id: "copy-pdp-bullets",
    legal: "pass" as const,
    charInfo: "✅ Legal PASS · evidence ≥2",
    text: `• Gallery-Quality OLED: Self-lit pixels deliver infinite contrast and true-to-life color — verified by 19,843 US owners.
• Gaming-Ready Performance: 1ms response, 4K@120Hz, VRR & G-Sync Compatible. Backed by 312 competitive gamer reviews.
• Virtually Zero Burn-In Risk: LG OLED Care+ with 6,000+ long-term owners — 98.8% report zero visible burn-in.
• Whisper-Quiet Intelligence: AI-powered noise reduction rated "whisper quiet" by 712 verified buyers.
• Connected Your Way: ThinQ AI with Matter & Thread — works with every smart home ecosystem.`,
  },
};

const PAID_COPY = {
  pmax: {
    label: "🔍 Google PMax — Headline / Description",
    meta: "Headline ≤30 chars · Description ≤90 chars",
    id: "copy-pmax",
    legal: "pass" as const,
    charInfo: "H1: 28/30 · H2: 26/30 · D1: 87/90",
    text: `Headline 1: LG OLED — Rated Best by 26K Owners
Headline 2: Zero Burn-In. 1ms Gaming. See Why.
Headline 3: Black Friday: LG OLED from $X,XXX

Description 1: 74% of verified buyers cite picture quality as life-changing. Experience true OLED blacks & cinema-grade color. Shop now.
Description 2: Gamers & cinema lovers agree: LG OLED exceeds every expectation. VRR, Dolby Vision, ThinQ AI included.`,
  },
  meta: {
    label: "📘 Meta (FB/IG) — Primary Text",
    meta: "Primary ≤125 chars · Hook first line",
    id: "copy-meta",
    legal: "pass" as const,
    charInfo: "A: 118/125 ✅ · B: 112/125 ✅",
    text: `Version A — Social Proof:
"26,000+ owners couldn't stay quiet about LG OLED. Neither can we. 🎬
See what real buyers say about the picture quality that changes everything."

Version B — Emotion Hook:
"I didn't realize how different it would look until I turned it on."
— Verified LG.com Buyer ✅
Join 26K+ owners who made the upgrade this season.`,
  },
  affiliate: {
    label: "🔗 Affiliate Text Link Copy",
    meta: "Partner link copy · FTC compliant",
    id: "copy-affiliate",
    legal: "warn" as const,
    charInfo: "⚠️ FTC disclosure required",
    text: `Short: LG OLED C5 — Best-rated OLED TV by 26,000+ verified buyers. [Shop Now →]

Long: After testing 50+ TVs, nothing compares to LG OLED's picture quality. 74% of owners call it life-changing — and at Black Friday pricing, it's the easiest recommendation we've ever made. [Check Price →]

※ Affiliate disclosure: This link may earn a commission. Reviews sourced from verified LG.com purchases.`,
  },
};

const RETAIL_COPY = {
  amazon: {
    label: "📦 Amazon A+ Content Text",
    meta: "Module Headline ≤70 chars · Body ≤300 chars",
    id: "copy-amazon",
    legal: "pass" as const,
    charInfo: "Headline: 62/70 ✅ · Body: 284/300 ✅",
    text: `Module Headline: The Picture Quality 26,000+ Owners Couldn't Stay Silent About

Body: Across 26,000+ verified Amazon and LG.com reviews, one theme dominates: LG OLED converts skeptics into advocates the moment they press power.
• Intuitive Connectivity: One-hub control — 847 owner mentions
• Whisper-Quiet Operation: Verified by 712 buyers
• Gaming-Grade Performance: 1ms response, cited in 312 gaming reviews
• True Cinematic Color: Self-lit OLED, infinite contrast ratio`,
  },
  retailer: {
    label: "🏪 Best Buy / Currys Product Description",
    meta: "Retailer-specific · SEO optimized",
    id: "copy-retailer",
    legal: "pass" as const,
    charInfo: "✅ ASA compliant · UK CMA reviewed",
    text: `Best Buy (US): Experience cinema-quality picture in your living room with LG OLED evo. Powered by the α9 AI Processor, this self-lit display delivers infinite contrast, 4K@120Hz gaming performance, and Dolby Vision IQ — all rated "life-changing" by verified Best Buy buyers.

Currys (UK): LG OLED evo brings the cinema home — rated 5-star by Currys customers for its breathtaking picture quality and whisper-quiet operation. Includes UK 3-pin, 2-year warranty, and LG CareShield coverage.`,
  },
};

const ASSETS = [
  { thumb_bg: "linear-gradient(135deg, #1a1a18, #2d1a16)", thumb_emoji: "🖥️", badge: { text: "LG.com", bg: "#B83228", color: "#fff" }, type: "Owned Media", name: "LG.com Hero Banner", spec: "1920×600px · Desktop\nKey copy: '26,000+ owners' · Dark cinematic tone", export_label: "↗ Figma", export_url: "https://figma.com", design_prompt: "LG OLED Hero Banner · 1920×600px · Dark cinematic background (#1a1a18) · Product: LG OLED G5 65 inch center · Text: 'The picture quality 26,000+ owners couldn't stay silent about' · Sub: 'OLED evo · Infinite Contrast · 4K@120Hz' · CTA: 'Shop Now' red button · Style: premium, minimal, photographic" },
  { thumb_bg: "linear-gradient(135deg, #1a52d4, #0d3aa8)", thumb_emoji: "🎬", badge: { text: "Meta", bg: "#1a52d4", color: "#fff" }, type: "Paid Media · Vertical", name: "Meta Reels Video", spec: "9:16 · 15–30s · Hook: Verified owner quote\nEmotional · UGC style · No voiceover", export_label: "↗ Canva", export_url: "https://canva.com", design_prompt: "Meta Reels 9:16 15s · Open with verified owner quote on black screen · Cut to living room TV reveal moment · Wow reaction UGC style · Whisper-quiet subtitle · End card: LG OLED logo + Join 26000+ owners · No voiceover · Music: subtle cinematic" },
  { thumb_bg: "linear-gradient(135deg, #1a8a4a, #0d6034)", thumb_emoji: "📊", badge: { text: "PMax", bg: "#1a8a4a", color: "#fff" }, type: "Paid Media · Google", name: "PMax Asset Group Image", spec: "1200×628 · 1:1 · 4:5 set\nLifestyle product shot · CTA overlay", export_label: "↗ Midjourney", export_url: "https://midjourney.com", design_prompt: "Google PMax 1200x628 · LG OLED lifestyle shot · Bright living room · Family watching · Overlay text: Rated #1 by 26000+ owners · Stars rating visual · LG logo top-left · CTA badge: Shop Black Friday Deals red · Clean white border" },
  { thumb_bg: "linear-gradient(135deg, #ff9900, #e07800)", thumb_emoji: "📦", badge: { text: "Amazon", bg: "#ff9900", color: "#fff" }, type: "Retailer · Amazon", name: "Amazon A+ Hero Image", spec: "970×300 · White BG · Swatch gallery\nBefore/After lifestyle · Infographic", export_label: "↗ Figma", export_url: "https://figma.com", design_prompt: "Amazon A+ 970x300 · White background · LG OLED product left side · Lifestyle right side · Headline: The Picture Quality Owners Cant Stop Talking About · 3 feature icons with text · Trust badges: Verified Purchase · Clean, editorial style" },
  { thumb_bg: "linear-gradient(135deg, #0070f3, #004db3)", thumb_emoji: "🏪", badge: { text: "Best Buy", bg: "#0070f3", color: "#fff" }, type: "Retailer · Best Buy", name: "Best Buy Banner Ad", spec: "300×250 · 728×90 set\nYellow BG accent · Price callout · Stars", export_label: "↗ Canva", export_url: "https://canva.com", design_prompt: "Best Buy banner 300x250 · Best Buy yellow #FFE000 accent · LG OLED product image · 5 star Top Rated badge · Price callout with strikethrough · Shop Now blue button · Best Buy logo bottom-right · Bold typography" },
  { thumb_bg: "linear-gradient(135deg, #c97a06, #9a5c04)", thumb_emoji: "📧", badge: { text: "Email", bg: "#c97a06", color: "#fff" }, type: "CRM · Email Campaign", name: "Black Friday Email Header", spec: "600px wide · 200px header\nUrgency tone · Countdown element", export_label: "↗ Figma", export_url: "https://figma.com", design_prompt: "Email header 600px · Black Friday theme · Dark red #B83228 gradient · LG OLED product center · Headline: Your Best Black Friday Yet · Countdown timer placeholder · Shop Now white CTA button · Urgency: Limited Stock badge" },
];

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════


function CopyBlock({
  label, meta, id, content, charInfo, legalStatus, copiedMap, onCopy,
}: {
  label: string; meta: string; id: string; content: string; charInfo: string;
  legalStatus: "pass" | "warn" | "fail";
  copiedMap: Record<string, boolean>;
  onCopy: (id: string, text: string) => void;
}) {
  const [regen, setRegen] = useState(false);
  const legalColor = legalStatus === "pass" ? "text-success" : legalStatus === "warn" ? "text-warning" : "text-destructive";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{meta}</span>
      </div>
      <div className="px-4 py-3.5 text-[13px] text-foreground leading-[1.65] whitespace-pre-wrap">{content}</div>
      <div className="px-4 py-2.5 border-t border-border flex items-center gap-2">
        <button
          onClick={() => onCopy(id, content)}
          className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          {copiedMap[id] ? "✅ Copied!" : "📋 Copy"}
        </button>
        <button
          onClick={() => { setRegen(true); setTimeout(() => setRegen(false), 900); }}
          className="px-3.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          {regen ? "↺ Regenerating..." : "↺ Regenerate"}
        </button>
        <span className={`ml-auto text-[11px] ${legalColor}`}>{charInfo}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ToolkitPage() {
  const { t, lang } = useLang();

  // Product search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Funnel
  const [selectedFunnel, setSelectedFunnel] = useState("awareness");

  // Reviews & insights
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Copy gen
  type CopyTab = "owned" | "paid" | "retail";
  const [activeCopyTab, setActiveCopyTab] = useState<CopyTab>("owned");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedMap((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [text.slice(0, 20)]: true }));
    setTimeout(() => setCopiedMap((prev) => ({ ...prev, [text.slice(0, 20)]: false })), 2000);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 1800);
  };

  // Search products from DB
  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data } = await supabase
        .from("products")
        .select("*")
        .or(`display_name.ilike.%${query}%,model_number.ilike.%${query}%`)
        .eq("is_active", true)
        .limit(10);
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

  // Load reviews for selected product
  const loadReviews = useCallback(async (productId: string) => {
    setIsLoadingReviews(true);
    try {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .limit(500);
      setProductReviews(data || []);
    } catch { setProductReviews([]); }
    setIsLoadingReviews(false);
  }, []);

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setSearchQuery("");
    setSearchResults([]);
    loadReviews(product.id);
  };

  // Derived: sentiment & insights
  const sentimentData = useMemo(() => {
    if (productReviews.length === 0) return null;
    return analyzeSentiment(productReviews.map(r => r.content || ""));
  }, [productReviews]);

  // Non-LG.com reviews for direct quote usage (privacy safe)
  const externalReviews = useMemo(() => {
    return productReviews.filter(r => !r.source?.startsWith("lge_com"));
  }, [productReviews]);

  // Strategic insights derived from reviews
  const strategicInsights = useMemo(() => {
    if (!sentimentData || productReviews.length === 0) return null;

    const positiveReviews = productReviews.filter(r => r.sentiment === "positive");
    const negativeReviews = productReviews.filter(r => r.sentiment === "negative");

    // Extract usage scenes
    const scenes = sentimentData.usageScenes || [];

    // Extract USP keywords
    const uspKeywords = [
      ...(sentimentData.phrases?.positive || []),
      ...(sentimentData.keywords.positive || []),
    ].filter(k => k.length > 3 && k.length < 40).slice(0, 8);

    // Target audience inference
    const audienceSignals: string[] = [];
    const allText = productReviews.map(r => (r.content || "").toLowerCase()).join(" ");
    if (allText.includes("gam")) audienceSignals.push(lang === "en" ? "🎮 Gamers (high-spec setup seekers)" : "🎮 게이머 (고성능 셋업 추구)");
    if (allText.includes("movie") || allText.includes("cinema") || allText.includes("film")) audienceSignals.push(lang === "en" ? "🎬 Home Cinema Enthusiasts" : "🎬 홈시네마 애호가");
    if (allText.includes("family") || allText.includes("kid")) audienceSignals.push(lang === "en" ? "👨‍👩‍👧‍👦 Family-oriented Buyers" : "👨‍👩‍👧‍👦 가족 중심 구매자");
    if (allText.includes("smart home") || allText.includes("alexa") || allText.includes("homekit")) audienceSignals.push(lang === "en" ? "🏠 Smart Home Adopters" : "🏠 스마트홈 얼리어답터");
    if (allText.includes("energy") || allText.includes("efficient") || allText.includes("quiet")) audienceSignals.push(lang === "en" ? "🌿 Eco-conscious Consumers" : "🌿 친환경 소비자");
    if (allText.includes("upgrade") || allText.includes("switch") || allText.includes("replace")) audienceSignals.push(lang === "en" ? "🔄 Upgraders from Competitor/Old Model" : "🔄 경쟁사/구형 모델 교체자");
    if (audienceSignals.length === 0) audienceSignals.push(lang === "en" ? "🛒 General Premium Consumers" : "🛒 일반 프리미엄 소비자");

    return {
      totalReviews: productReviews.length,
      positiveCount: positiveReviews.length,
      negativeCount: negativeReviews.length,
      scenes: scenes.slice(0, 6),
      uspKeywords,
      audienceSignals: audienceSignals.slice(0, 4),
      topStrengths: (sentimentData.phrases?.positive || sentimentData.keywords.positive || []).slice(0, 5),
      topPainPoints: (sentimentData.phrases?.negative || sentimentData.keywords.negative || []).slice(0, 5),
    };
  }, [sentimentData, productReviews, lang]);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Wrench}
        title="🚀 Paid Marketing Generation"
        description={t(
          "Search a product → Select ad purpose → Get AI-generated marketing copy, strategic insights, and media assets instantly.",
          "제품 검색 → 광고 목적 선택 → AI 기반 마케팅 카피, 전략 인사이트, 미디어 에셋을 즉시 생성합니다."
        )}
      />

      {/* ═══════ STEP 1: Product Search ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold shrink-0">1</span>
          <h2 className="text-base font-bold font-heading text-foreground">{t("Product Search", "제품 검색")}</h2>
          <span className="text-xs text-muted-foreground ml-auto">{t("Search by name or model number", "제품명 또는 모델번호로 검색")}</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("e.g. OLED C5, WashTower, UltraGear ...", "예: OLED C5, WashTower, UltraGear ...")}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 rounded-xl border border-border bg-card shadow-lg max-h-[300px] overflow-y-auto">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors border-b border-border/50 last:border-0"
              >
                <span className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">{p.sub_category || p.category}</span>
                <span className="text-sm font-medium text-foreground flex-1">{p.display_name}</span>
                <span className="text-[11px] text-muted-foreground font-mono">{p.model_number}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected product */}
        {selectedProduct && (
          <div className="mt-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">📦</span>
              <div>
                <p className="text-sm font-bold text-foreground">{selectedProduct.display_name}</p>
                <p className="text-[11px] text-muted-foreground">{selectedProduct.sub_category || selectedProduct.category} · {selectedProduct.model_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoadingReviews ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {t("Loading reviews...", "리뷰 로딩중...")}</span>
              ) : (
                <span className="text-xs text-muted-foreground">{productReviews.length} {t("reviews loaded", "건 리뷰 로드됨")}</span>
              )}
              <button onClick={() => { setSelectedProduct(null); setProductReviews([]); }} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ STEP 2: Ad Purpose / Funnel ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold shrink-0">2</span>
          <h2 className="text-base font-bold font-heading text-foreground">{t("Ad Purpose (Funnel Stage)", "광고 목적 (퍼널 단계)")}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AD_FUNNELS.map((f) => (
            <button
              key={f.key}
              onClick={() => setSelectedFunnel(f.key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedFunnel === f.key
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={selectedFunnel === f.key ? "text-primary" : "text-muted-foreground"}>{f.icon}</span>
                <span className="text-xs font-bold">{lang === "en" ? f.labelEn : f.labelKo}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{lang === "en" ? f.descEn : f.descKo}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ Strategic Insights (shown when product selected) ═══════ */}
      {selectedProduct && strategicInsights && (
        <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
          <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold shrink-0">
              <Target className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base font-bold font-heading text-foreground">{t("Strategic Insights", "전략 인사이트")}</h2>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary ml-auto">
              {strategicInsights.totalReviews} {t("reviews analyzed", "건 리뷰 분석")}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Audience */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold">{t("Target Audience", "주사용 공략대상")}</h4>
              </div>
              <div className="space-y-2">
                {strategicInsights.audienceSignals.map((signal, i) => (
                  <div key={i} className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2">
                    <span className="text-xs text-foreground/90">{signal}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground">
                  {t("Positive:", "긍정:")} <span className="text-success font-medium">{strategicInsights.positiveCount}</span> · {t("Negative:", "부정:")} <span className="text-destructive font-medium">{strategicInsights.negativeCount}</span>
                </p>
              </div>
            </div>

            {/* Usage Scenes */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold">{t("Key Usage Scenes", "주요 사용씬")}</h4>
              </div>
              <div className="space-y-2">
                {strategicInsights.scenes.length > 0 ? strategicInsights.scenes.map((scene, i) => (
                  <div key={i} className="flex items-center gap-2 bg-blue-500/5 rounded-lg px-3 py-2 border border-blue-500/10">
                    <span className="text-[10px] font-bold text-blue-400 shrink-0">📍 {i + 1}</span>
                    <span className="text-xs text-foreground/90">{scene}</span>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground">{t("Not enough data", "데이터 부족")}</p>
                )}
              </div>
            </div>

            {/* Product USP */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold">{t("Product USP", "제품 핵심 강점 (USP)")}</h4>
              </div>
              <div className="space-y-1.5">
                {strategicInsights.topStrengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 bg-success/5 rounded-lg px-3 py-2 border border-success/10">
                    <span className="text-[10px] font-bold text-success shrink-0">💪</span>
                    <span className="text-xs text-foreground/90">{s}</span>
                  </div>
                ))}
              </div>
              {strategicInsights.topPainPoints.length > 0 && (
                <div className="pt-2 border-t border-border/50 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">{t("Pain Points to Address", "대응 필요 포인트")}</p>
                  {strategicInsights.topPainPoints.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-start gap-2 bg-destructive/5 rounded-lg px-3 py-1.5 border border-destructive/10">
                      <span className="text-[10px]">⚠️</span>
                      <span className="text-[11px] text-foreground/80">{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* USP Keywords cloud */}
          {strategicInsights.uspKeywords.length > 0 && (
            <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">🔑 {t("USP Keywords (from reviews)", "USP 키워드 (리뷰 기반)")}</p>
              <div className="flex flex-wrap gap-2">
                {strategicInsights.uspKeywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => copyText(kw)}
                    className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ External Reviews (non-LG.com — privacy-safe for direct use) ═══════ */}
      {selectedProduct && externalReviews.length > 0 && (
        <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
          <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold font-heading text-foreground">{t("Customer Voices (External Channels)", "고객 목소리 (외부 채널)")}</h2>
            <Badge variant="outline" className="text-[10px] text-muted-foreground ml-auto">
              {t("Privacy-safe: Reddit, Amazon, YouTube etc.", "개인정보 안전: Reddit, Amazon, YouTube 등")}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            {t(
              "⚖️ LG.com reviews contain user-generated content subject to the platform's terms of service. For external marketing use, we prioritize reviews from third-party channels (Reddit, Amazon, YouTube) which are publicly available UGC.",
              "⚖️ LG.com 리뷰는 플랫폼 서비스 약관이 적용되는 사용자 생성 콘텐츠입니다. 외부 마케팅 활용 시에는 공개적으로 이용 가능한 UGC인 제3자 채널(Reddit, Amazon, YouTube) 리뷰를 우선 활용합니다."
            )}
          </p>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {externalReviews.slice(0, 20).map((review, i) => {
              const summary = (review.content || "").slice(0, 150).trim();
              const sentimentColor = review.sentiment === "positive" ? "text-success" : review.sentiment === "negative" ? "text-destructive" : "text-muted-foreground";
              const sourceLabel = review.source?.replace(/_/g, " ").replace(/^reddit/, "Reddit").replace(/^youtube/, "YouTube") || "External";
              return (
                <div key={i} className="flex items-start gap-3 bg-card rounded-lg p-3 border border-border/50 group hover:border-primary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase ${sentimentColor}`}>
                        {review.sentiment === "positive" ? "👍" : review.sentiment === "negative" ? "👎" : "➖"} {review.sentiment || "neutral"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{sourceLabel}</span>
                      {review.rating && <span className="text-[10px] text-warning">{"★".repeat(Math.min(review.rating, 5))}</span>}
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{summary}{(review.content || "").length > 150 ? "..." : ""}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => copyText(summary)}
                      className="px-2.5 py-1 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {t("1-line", "1줄요약")}
                    </button>
                    <button
                      onClick={() => copyText(`"${summary}" — ${sourceLabel}`)}
                      className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      {t("Copy", "카피")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ AI Text Copy Generation ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold shrink-0">3</span>
          <h2 className="text-base font-bold font-heading text-foreground">{t("AI Text Copy Generation", "AI 텍스트 카피 생성")}</h2>
          <span className="text-xs text-muted-foreground ml-auto">{t("Channel-specific auto-generation · Legal pre-review included", "채널별 자동 생성 · 법률 사전 검토 포함")}</span>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(4,58%,55%)] text-white text-[15px] font-bold tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all mb-5 disabled:opacity-70"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("Generating...", "생성 중...")}
            </span>
          ) : (
            t("✨ Generate All Copy — Owned · Paid · Retail", "✨ 전체 카피 생성 — Owned · Paid · Retail")
          )}
        </button>

        {/* Tabs */}
        <div className="border-b-2 border-border mb-5 flex">
          {([["owned", "🏢 Owned Media (LG.com)"], ["paid", "📡 Paid Media (Performance)"], ["retail", "🛒 Retailers"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveCopyTab(key)}
              className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] transition-colors ${
                activeCopyTab === key
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeCopyTab === "owned" && (
          <CopyBlock {...OWNED_COPY.bullets} content={OWNED_COPY.bullets.text} charInfo={OWNED_COPY.bullets.charInfo} legalStatus={OWNED_COPY.bullets.legal} copiedMap={copiedMap} onCopy={handleCopy} />
        )}
        {activeCopyTab === "paid" && (
          <>
            <CopyBlock {...PAID_COPY.pmax} content={PAID_COPY.pmax.text} charInfo={PAID_COPY.pmax.charInfo} legalStatus={PAID_COPY.pmax.legal} copiedMap={copiedMap} onCopy={handleCopy} />
            <CopyBlock {...PAID_COPY.meta} content={PAID_COPY.meta.text} charInfo={PAID_COPY.meta.charInfo} legalStatus={PAID_COPY.meta.legal} copiedMap={copiedMap} onCopy={handleCopy} />
            <CopyBlock {...PAID_COPY.affiliate} content={PAID_COPY.affiliate.text} charInfo={PAID_COPY.affiliate.charInfo} legalStatus={PAID_COPY.affiliate.legal} copiedMap={copiedMap} onCopy={handleCopy} />
          </>
        )}
        {activeCopyTab === "retail" && (
          <>
            <CopyBlock {...RETAIL_COPY.amazon} content={RETAIL_COPY.amazon.text} charInfo={RETAIL_COPY.amazon.charInfo} legalStatus={RETAIL_COPY.amazon.legal} copiedMap={copiedMap} onCopy={handleCopy} />
            <CopyBlock {...RETAIL_COPY.retailer} content={RETAIL_COPY.retailer.text} charInfo={RETAIL_COPY.retailer.charInfo} legalStatus={RETAIL_COPY.retailer.legal} copiedMap={copiedMap} onCopy={handleCopy} />
          </>
        )}
      </div>

      {/* ═══════ Media Asset Creation ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold shrink-0">4</span>
          <h2 className="text-base font-bold font-heading text-foreground">{t("Media Asset Creation", "미디어 에셋 크리에이션")}</h2>
          <span className="text-xs text-muted-foreground ml-auto">{t("Image/video/banner external tool integration · Auto design prompt", "이미지/영상/배너 외부 툴 연동 · 자동 디자인 프롬프트")}</span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {ASSETS.map((a, i) => (
            <div key={i} className="bg-card border border-border rounded-[14px] overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-[90px] flex items-center justify-center relative" style={{ background: a.thumb_bg }}>
                <span className="text-[32px]">{a.thumb_emoji}</span>
                <span
                  className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: a.badge.bg, color: a.badge.color }}
                >
                  {a.badge.text}
                </span>
              </div>
              <div className="p-4">
                <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{a.type}</p>
                <h4 className="text-sm font-bold text-foreground mb-1.5">{a.name}</h4>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed whitespace-pre-line mb-3.5">{a.spec}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(`asset-${i}`, a.design_prompt)}
                    className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    {copiedMap[`asset-${i}`] ? "✅ Copied!" : "📋 Copy Design Prompt"}
                  </button>
                  <button
                    onClick={() => window.open(a.export_url, "_blank")}
                    className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {a.export_label}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ ANITA CREATIVE STUDIO ═══════ */}
      <a
        href="https://anita-twincrew.lovable.app/studio"
        target="_blank"
        rel="noopener noreferrer"
        className="group gradient-card rounded-xl border border-border p-5 md:p-6 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer block"
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shrink-0 shadow-md">
            <Sparkles className="h-6 w-6" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-foreground">🎨 LG CreW Anita — AI Creative Studio</h3>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              {t(
                "Create product lifestyle images & banners in one place. Click to open Anita Studio.",
                "제품 라이프스타일 이미지 및 배너를 한 곳에서 제작합니다. 클릭하여 Anita Studio로 이동하세요."
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 pl-[4.5rem]">
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3.5 py-1.5 text-[11px] font-semibold">
            <Image className="h-3.5 w-3.5" /> {t("Image Generation", "이미지 생성")}
          </span>
          <span className="text-muted-foreground text-xs">+</span>
          <span className="flex items-center gap-1.5 rounded-full bg-accent/30 text-accent-foreground px-3.5 py-1.5 text-[11px] font-semibold">
            <LayoutTemplate className="h-3.5 w-3.5" /> {t("Banner Creation", "배너 제작")}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
            {t("Open Studio →", "스튜디오 열기 →")}
          </span>
        </div>
      </a>
    </div>
  );
}
