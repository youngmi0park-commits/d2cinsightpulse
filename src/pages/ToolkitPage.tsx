import { useState, useCallback } from "react";
import { ExternalLink, Loader2, Check, Wrench, X, Briefcase, Image, LayoutTemplate, Sparkles, Zap, Copy, Users, TrendingUp, ShieldAlert, Heart, ArrowRightLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ProductSearchInput } from "@/components/ProductSearchInput";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { analyzeSentiment, type SentimentResult } from "@/lib/sentiment";
import { toReviewFormat } from "@/hooks/useProductData";

// ═══════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════

interface SelectedProduct {
  id: string;
  display_name: string;
  model_number: string;
  category: string;
  sub_category?: string;
}

interface InsightData {
  persona_insights?: {
    core_user_groups?: { product: string; main_purpose: string; use_scenes: string[]; evaluation_criteria: string[]; lifestyle: string; purchase_motivation: string; satisfaction_points: string[]; pain_points: string[]; }[];
    potential_user_groups?: { product: string; target_group: string; expected_use_scenes: string[]; interests: string[]; lifestyle_context: string; creative_direction: string; }[];
  };
  jtbd_insights?: {
    anxiety?: { product: string; concern: string; frequency: string }[];
    delight?: { product: string; resolution: string; recommend_words: string[] }[];
    switching_points?: { product: string; from_competitor: string; decisive_reason: string }[];
  };
  summary?: string;
}

interface VocItem { quote: string; source: string; sentiment: string; }

interface GeneratedCopy {
  owned: string;
  paid: string;
  retail: string;
}

interface AllResults {
  insights: InsightData;
  metadata: { analyzed_products: any[]; region: string; generated_at: string };
  vocs: VocItem[];
  hooks: { keyword: string; copy: string; sentiment: string }[];
  sentiment: SentimentResult;
  copy: GeneratedCopy;
}

// ═══════════════════════════════════════════════════════════════
//  STATIC DATA (Campaign Context)
// ═══════════════════════════════════════════════════════════════

const EVENTS = [
  "🖤 Black Friday (Nov)", "💻 Cyber Monday (Nov)", "⚡ Prime Day (Jul)", "🛒 Amazon Spring Sale (Mar)",
  "🎒 Back to School (Jul–Aug)", "🎄 Holiday Season (Dec)", "💝 Valentine's Day (Feb)", "👨 Father's Day (Jun)",
  "🏠 Home Refresh (Spring)", "🍂 Fall Refresh (Sep–Oct)",
  "🎮 Gaming Season (Q4)", "🏈 Super Bowl / Big Game (Feb)", "🏆 FIFA / World Cup Season",
  "📺 New Model Launch (CES Jan)", "📺 Mid-Year Line Refresh (Jun)",
  "🇬🇧 Boxing Day (Dec 26)", "🇨🇦 Canada Day (Jul 1)", "🇩🇪 German Unity Day (Oct)",
  "🏷️ End-of-Season Clearance", "📦 Warehouse / Outlet Sale",
];
const MARKETS = [
  "🇺🇸 US (LGEUS)", "🇬🇧 UK (LGEUK)", "🇨🇦 CA (LGECI)", "🇦🇺 AU (LGEAP)",
  "🇩🇪 DE (LGEDG)", "🇫🇷 FR (LGEFS)", "🇮🇹 IT (LGEIS)", "🇪🇸 ES (LGEES)",
  "🇳🇱 NL (LGENL)", "🇸🇪 SE (LGEND)", "🇵🇱 PL (LGEPL)", "🇮🇳 IN (LGEIL)",
  "🇸🇬 SG (LGESL)", "🇲🇽 MX (LGEMS)", "🇧🇷 BR (LGEBR)", "🌐 Global All",
];
const GOALS = [
  "🚀 Awareness", "💡 Consideration", "🛒 Conversion", "🔁 Retention / Upsell",
  "🆕 New Launch Hype", "⚔️ Competitive Conquest", "🏷️ Clearance / Sell-through",
  "📈 Market Share Growth", "💎 Premium Positioning",
];
const CAMPAIGN_TYPES = [
  "📺 Single Product Focus", "🎁 Bundle / Cross-sell", "🏷️ Category Push (e.g. All OLED TVs)",
  "🏠 Lifestyle / Ecosystem (Multi-category)", "🆚 Competitive Switch",
  "📦 Inventory Liquidation", "🆕 Pre-order / Launch",
];
const PRODUCT_CATEGORIES = [
  "📺 TV", "🧊 냉장고 (Refrigerator)", "👕 세탁기 (Washer)",
  "🍳 식기세척기 (Dishwasher)", "💻 노트북 (Laptop)",
  "🖥️ 모니터 (Monitor)", "🔊 사운드바 (Soundbar)",
  "🌀 에어컨 (Air Care)", "🤖 청소기 (Vacuum)",
];

const ASSETS = [
  { thumb_bg: "linear-gradient(135deg, #1a1a18, #2d1a16)", thumb_emoji: "🖥️", badge: { text: "LG.com", bg: "#B83228", color: "#fff" }, type: "Owned Media", name: "LG.com Hero Banner", spec: "1920×600px · Desktop\nKey copy: Review-driven · Dark cinematic tone", export_label: "↗ Figma", export_url: "https://figma.com", design_prompt: "LG OLED Hero Banner · 1920×600px · Dark cinematic background (#1a1a18) · Product center · Review-driven headline · CTA: 'Shop Now' red button · Style: premium, minimal, photographic" },
  { thumb_bg: "linear-gradient(135deg, #1a52d4, #0d3aa8)", thumb_emoji: "🎬", badge: { text: "Meta", bg: "#1a52d4", color: "#fff" }, type: "Paid Media · Vertical", name: "Meta Reels Video", spec: "9:16 · 15–30s · Hook: Verified owner quote\nEmotional · UGC style · No voiceover", export_label: "↗ Canva", export_url: "https://canva.com", design_prompt: "Meta Reels 9:16 15s · Open with verified owner quote · Cut to product reveal · UGC style · End card: LG logo · No voiceover · Music: subtle cinematic" },
  { thumb_bg: "linear-gradient(135deg, #1a8a4a, #0d6034)", thumb_emoji: "📊", badge: { text: "PMax", bg: "#1a8a4a", color: "#fff" }, type: "Paid Media · Google", name: "PMax Asset Group Image", spec: "1200×628 · 1:1 · 4:5 set\nLifestyle product shot · CTA overlay", export_label: "↗ Midjourney", export_url: "https://midjourney.com", design_prompt: "Google PMax 1200x628 · Product lifestyle shot · Bright living room · Overlay text from reviews · LG logo top-left · CTA badge · Clean white border" },
  { thumb_bg: "linear-gradient(135deg, #ff9900, #e07800)", thumb_emoji: "📦", badge: { text: "Amazon", bg: "#ff9900", color: "#fff" }, type: "Retailer · Amazon", name: "Amazon A+ Hero Image", spec: "970×300 · White BG · Swatch gallery\nReview-driven · Infographic", export_label: "↗ Figma", export_url: "https://figma.com", design_prompt: "Amazon A+ 970x300 · White background · Product left · Headline from reviews · 3 feature icons · Trust badges · Clean editorial style" },
  { thumb_bg: "linear-gradient(135deg, #0070f3, #004db3)", thumb_emoji: "🏪", badge: { text: "Best Buy", bg: "#0070f3", color: "#fff" }, type: "Retailer · Best Buy", name: "Best Buy Banner Ad", spec: "300×250 · 728×90 set\nYellow BG accent · Price callout · Stars", export_label: "↗ Canva", export_url: "https://canva.com", design_prompt: "Best Buy banner 300x250 · Yellow #FFE000 accent · Product image · 5 star Top Rated badge · Price callout · Shop Now blue button · Best Buy logo bottom-right" },
  { thumb_bg: "linear-gradient(135deg, #c97a06, #9a5c04)", thumb_emoji: "📧", badge: { text: "Email", bg: "#c97a06", color: "#fff" }, type: "CRM · Email Campaign", name: "Campaign Email Header", spec: "600px wide · 200px header\nUrgency tone · Review highlight", export_label: "↗ Figma", export_url: "https://figma.com", design_prompt: "Email header 600px · Dark red #B83228 gradient · Product center · Headline from top review · Shop Now white CTA button" },
];

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{step}</span>
      <h2 className="text-base font-bold font-heading text-foreground">{title}</h2>
      <span className="text-xs text-muted-foreground ml-auto">{subtitle}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.6px] mb-3">{children}</p>;
}

function CopyBlock({ label, content, copiedMap, onCopy, id }: {
  label: string; content: string; id: string;
  copiedMap: Record<string, boolean>; onCopy: (id: string, text: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="px-4 py-3.5 text-[13px] text-foreground leading-[1.65] whitespace-pre-wrap">{content}</div>
      <div className="px-4 py-2.5 border-t border-border">
        <button onClick={() => onCopy(id, content)} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
          {copiedMap[id] ? "✅ Copied!" : "📋 Copy"}
        </button>
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, title, children, color }: { icon: any; title: string; children: React.ReactNode; color: string }) {
  return (
    <div className={`rounded-lg border ${color} p-3`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ProductTag({ name }: { name: string }) {
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/15">{name}</Badge>;
}

function SeverityBadge({ level }: { level: string }) {
  const color = level === "높음" ? "bg-destructive/15 text-destructive border-destructive/20"
    : level === "중간" ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/20"
    : "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={`text-[10px] ${color}`}>{level}</Badge>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted/50 transition-colors" title="Copy">
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

function SelectDropdown({ label, value, options, placeholder, onChange }: {
  label: string; value: string; options: string[]; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.6px]">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="min-w-[200px] px-3.5 py-2.5 rounded-[10px] border border-border bg-card text-[13.5px] text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ToolkitPage() {
  const { t } = useLang();

  // Campaign context
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedCampaignType, setSelectedCampaignType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Product selection
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<AllResults | null>(null);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  type CopyTab = "owned" | "paid" | "retail";
  const [activeCopyTab, setActiveCopyTab] = useState<CopyTab>("owned");

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedMap((prev) => ({ ...prev, [id]: false })), 2000);
  }, []);

  // ─── Unified Generate All ───
  const handleGenerateAll = async () => {
    if (!selectedProduct) {
      toast.error(t("Please select a product first", "먼저 제품을 선택하세요"));
      return;
    }

    setIsGenerating(true);
    setResults(null);

    try {
      // 1. Fetch reviews for the selected product
      const { data: reviews, error: revError } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", selectedProduct.id)
        .order("collected_at", { ascending: false })
        .limit(200);

      if (revError) throw revError;
      const formattedReviews = (reviews || []).map(toReviewFormat);

      if (formattedReviews.length === 0) {
        toast.error(t("No reviews found for this product", "이 제품의 리뷰를 찾을 수 없습니다"));
        setIsGenerating(false);
        return;
      }

      // 2. Run local sentiment analysis
      const sentiment = analyzeSentiment(formattedReviews);

      // 3. Call analyze-weekly-insights for persona/JTBD
      const insightsPromise = supabase.functions.invoke("analyze-weekly-insights", {
        body: { region: "all", limit: 5, product_id: selectedProduct.id },
      });

      // 4. Generate AI copy
      const prName = selectedProduct.display_name;
      const strengths = (sentiment.phrases?.positive || []).slice(0, 5);
      const painPoints = (sentiment.phrases?.negative || []).slice(0, 5);
      const scenes = (sentiment.usageScenes || []).slice(0, 5).map(s => s.replace(/\s*\(\d+x\)$/, ""));
      const total = sentiment.positive + sentiment.negative + sentiment.neutral;

      const copyPrompt = `You are a senior D2C digital marketing copy strategist for LG Electronics.
Generate marketing copy for: ${prName} (${selectedProduct.category})
${selectedMarket ? `Market: ${selectedMarket}` : "Market: Global"}
${selectedEvent ? `Event: ${selectedEvent}` : ""}
${selectedGoal ? `Goal: ${selectedGoal}` : ""}

Review data: ${total} reviews analyzed. Positive: ${sentiment.positive}, Negative: ${sentiment.negative}.
Top strengths: ${strengths.join(", ") || "N/A"}
Pain points: ${painPoints.join(", ") || "N/A"}
Usage scenes: ${scenes.join(", ") || "N/A"}
Top positive evidence: "${sentiment.topPositivePhrase || "N/A"}"
Top negative evidence: "${sentiment.topNegativePhrase || "N/A"}"

Generate three sections in Korean with English terms:

[OWNED]
PDP Feature Highlights (5 bullet points, each ≤100 chars)
+ PDP FAQ (3 Q&A pairs based on actual review concerns)

[PAID]
Google PMax (Headline 1-3 ≤30 chars each + Description 1-2 ≤90 chars each)
Meta Ad (Primary text ≤125 chars + Headline ≤40 chars)

[RETAIL]
Amazon A+ (Module Headline ≤70 chars + Body ≤300 chars + 3 bullets)
Best Buy/Walmart product description (2 paragraphs)

Rules:
- Use review-derived evidence, not generic marketing language
- Include social proof like "verified buyers report..."
- No superlatives without evidence
- Generate A/B versions where possible`;

      const copyPromise = supabase.functions.invoke("generate-faq", {
        body: { prompt: copyPrompt, mode: "strategy" },
      });

      // 5. Extract VoC from reviews
      const posReviews = formattedReviews.filter(r => r.sentiment === "positive").slice(0, 6);
      const negReviews = formattedReviews.filter(r => r.sentiment === "negative").slice(0, 3);
      const vocs: VocItem[] = [
        ...posReviews.map(r => ({
          quote: r.text.length > 150 ? r.text.slice(0, 150) + "..." : r.text,
          source: `${r.source.startsWith("lge_com") ? "LG.com" : r.source.startsWith("reddit") ? "Reddit" : r.source} · ${r.author || "Anonymous"}`,
          sentiment: "positive",
        })),
        ...negReviews.map(r => ({
          quote: r.text.length > 150 ? r.text.slice(0, 150) + "..." : r.text,
          source: `${r.source.startsWith("lge_com") ? "LG.com" : r.source.startsWith("reddit") ? "Reddit" : r.source} · ${r.author || "Anonymous"}`,
          sentiment: "negative",
        })),
      ];

      // 6. Extract search intent hooks from keywords
      const posKw = sentiment.keywords.positive.slice(0, 4);
      const negKw = sentiment.keywords.negative.slice(0, 2);
      const hooks = [
        ...posKw.map(kw => ({
          keyword: kw,
          copy: `"${prName} — users describe it as '${kw}'. See ${total}+ verified reviews."`,
          sentiment: "positive",
        })),
        ...negKw.map(kw => ({
          keyword: kw,
          copy: `"Concerned about '${kw}'? ${sentiment.positive} verified buyers say otherwise."`,
          sentiment: "negative",
        })),
      ];

      // 7. Await parallel calls
      const [insightsRes, copyRes] = await Promise.all([insightsPromise, copyPromise]);

      const insights: InsightData = insightsRes.data?.insights || {};
      const metadata = insightsRes.data?.metadata || { analyzed_products: [], region: "all", generated_at: new Date().toISOString() };

      const copyText = copyRes.data?.answer || copyRes.data?.result || copyRes.data?.plan || "";

      // Parse copy sections
      const ownedMatch = copyText.match(/\[OWNED\]([\s\S]*?)(?=\[PAID\]|$)/i);
      const paidMatch = copyText.match(/\[PAID\]([\s\S]*?)(?=\[RETAIL\]|$)/i);
      const retailMatch = copyText.match(/\[RETAIL\]([\s\S]*?)$/i);

      const copy: GeneratedCopy = {
        owned: ownedMatch?.[1]?.trim() || copyText.slice(0, Math.floor(copyText.length / 3)),
        paid: paidMatch?.[1]?.trim() || copyText.slice(Math.floor(copyText.length / 3), Math.floor(copyText.length * 2 / 3)),
        retail: retailMatch?.[1]?.trim() || copyText.slice(Math.floor(copyText.length * 2 / 3)),
      };

      setResults({ insights, metadata, vocs, hooks, sentiment, copy });
      toast.success(t("All results generated!", "전체 결과가 생성되었습니다!"));
    } catch (err: any) {
      console.error("Generate all error:", err);
      toast.error(t("Generation failed", "생성 실패") + ": " + (err.message || "Unknown"));
    } finally {
      setIsGenerating(false);
    }
  };

  const ins = results?.insights;

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Wrench}
        title="🚀 Global Marketing Toolkit"
        description={t(
          "Select a product and generate all marketing assets at once — Strategy, Persona, Content Hooks, VoC, and AI Copy.",
          "제품을 선택하고 한 번에 모든 마케팅 자산을 생성하세요 — 전략, 페르소나, 콘텐츠 훅, VoC, AI 카피."
        )}
      />

      {/* ═══════ PRODUCT SELECTION + CAMPAIGN CONTEXT ═══════ */}
      <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
        <StepHeader step={1} title={t("Product & Campaign Context", "제품 선택 & 캠페인 컨텍스트")} subtitle={t("Select product → Generate all", "제품 선택 → 전체 생성")} />

        {/* Product Search — PROMINENT */}
        <div className="mb-6">
          <SectionLabel>🔍 {t("SELECT PRODUCT", "제품 선택")}</SectionLabel>
          <div className="flex items-center gap-3">
            <ProductSearchInput
              onSelect={(p) => setSelectedProduct(p as SelectedProduct)}
              placeholder={t("Search product to analyze...", "분석할 제품을 검색하세요...")}
              className="flex-1 max-w-lg"
            />
            {selectedProduct && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">{selectedProduct.category}</Badge>
                <span className="text-sm font-semibold text-foreground">{selectedProduct.display_name}</span>
                <button onClick={() => setSelectedProduct(null)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
        </div>

        {/* Campaign context — optional dropdowns */}
        <SectionLabel>{t("CAMPAIGN CONTEXT (Optional)", "캠페인 컨텍스트 (선택사항)")}</SectionLabel>
        <div className="flex gap-3.5 mb-6 flex-wrap">
          <SelectDropdown label={t("SEASONAL EVENT", "시즌 이벤트")} value={selectedEvent} options={EVENTS} placeholder={t("— Select —", "— 선택 —")} onChange={setSelectedEvent} />
          <SelectDropdown label={t("TARGET MARKET", "타겟 시장")} value={selectedMarket} options={MARKETS} placeholder={t("— Select —", "— 선택 —")} onChange={setSelectedMarket} />
          <SelectDropdown label={t("CAMPAIGN GOAL", "캠페인 목표")} value={selectedGoal} options={GOALS} placeholder={t("— Select —", "— 선택 —")} onChange={setSelectedGoal} />
          <SelectDropdown label={t("PRODUCT CATEGORY", "제품 카테고리")} value={selectedCategory} options={PRODUCT_CATEGORIES} placeholder={t("— Select —", "— 선택 —")} onChange={setSelectedCategory} />
          <SelectDropdown label={t("CAMPAIGN TYPE", "캠페인 유형")} value={selectedCampaignType} options={CAMPAIGN_TYPES} placeholder={t("— Select —", "— 선택 —")} onChange={setSelectedCampaignType} />
        </div>

        {/* ── UNIFIED GENERATE BUTTON ── */}
        <button
          onClick={handleGenerateAll}
          disabled={isGenerating || !selectedProduct}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-[hsl(4,58%,55%)] text-primary-foreground text-[15px] font-bold tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("Generating All Results...", "전체 결과 생성 중...")}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Zap className="h-5 w-5" />
              {t("⚡ Generate All — Strategy · Persona · Content · Copy", "⚡ 전체 생성 — 전략 · 페르소나 · 콘텐츠 · 카피")}
            </span>
          )}
        </button>
        {!selectedProduct && (
          <p className="text-[10.5px] text-muted-foreground mt-2 text-center">
            {t("Select a product above to enable generation", "위에서 제품을 선택하면 생성이 활성화됩니다")}
          </p>
        )}
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">{t("Analyzing reviews & generating all results with AI...", "리뷰 분석 & AI로 전체 결과 생성 중...")}</p>
          <p className="text-xs">{t("This may take 30-60 seconds", "30~60초 소요될 수 있습니다")}</p>
        </div>
      )}

      {/* ═══════ RESULTS — All 3 sections shown together ═══════ */}
      {results && !isGenerating && (
        <>
          {/* Product summary bar */}
          <div className="flex items-center gap-3 flex-wrap px-1">
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">{selectedProduct?.category}</Badge>
            <span className="text-sm font-bold">{selectedProduct?.display_name}</span>
            <Badge variant="secondary" className="text-[10px]">
              {results.sentiment.positive + results.sentiment.negative + results.sentiment.neutral}건 분석
            </Badge>
            <div className={`px-2 py-0.5 rounded-md border text-xs font-bold ${
              results.sentiment.compositeScore >= 56 ? "bg-[#006600]/10 border-[#006600]/20 text-[#006600]" : "bg-amber-500/10 border-amber-500/20 text-amber-600"
            }`}>
              {results.sentiment.compositeScore}/100
            </div>
          </div>

          {/* ═══════ SECTION 1: Global Strategy & Persona ═══════ */}
          <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
            <StepHeader step={2} title={t("Global Strategy & Persona", "글로벌 전략 & 페르소나")} subtitle={t("AI-analyzed from real reviews", "실제 리뷰 AI 분석 결과")} />

            {/* Summary */}
            {ins?.summary && (
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">{ins.summary}</p>
                </div>
              </div>
            )}

            {/* Analyzed products */}
            {results.metadata?.analyzed_products?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border mb-4">
                <span className="text-[10px] text-muted-foreground mr-1">{t("Analyzed:", "분석 대상:")}</span>
                {results.metadata.analyzed_products.map((p: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] gap-1">
                    {p.display_name || p.model_number}
                    <span className="text-muted-foreground">({p.positive_count + p.negative_count}건)</span>
                  </Badge>
                ))}
              </div>
            )}

            {/* Core User Group */}
            <InsightCard icon={Users} title={t("Core User Group — Main User", "주 사용층 (Main User)")} color="border-blue-500/20 bg-blue-500/5">
              {(ins?.persona_insights?.core_user_groups || []).map((item, i) => (
                <div key={i} className="bg-background/60 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <ProductTag name={item.product} />
                    <CopyBtn text={`[${item.product}]\n주 사용 목적: ${item.main_purpose}\n사용 장면: ${item.use_scenes?.join(", ")}\n평가 기준: ${item.evaluation_criteria?.join(", ")}\n라이프스타일: ${item.lifestyle}\n구매 동기: ${item.purchase_motivation}\n만족: ${item.satisfaction_points?.join(", ")}\n불만: ${item.pain_points?.join(", ")}`} />
                  </div>
                  <div className="grid gap-1.5 text-xs">
                    <div><span className="text-muted-foreground font-medium">🎯 주 사용 목적:</span> <span className="text-foreground">{item.main_purpose}</span></div>
                    <div><span className="text-muted-foreground font-medium">🏠 사용 장면:</span> <span className="text-foreground">{item.use_scenes?.join(" · ") || "—"}</span></div>
                    <div><span className="text-muted-foreground font-medium">📋 평가 기준:</span> <span className="text-foreground">{item.evaluation_criteria?.join(" · ") || "—"}</span></div>
                    <div><span className="text-muted-foreground font-medium">🧬 라이프스타일:</span> <span className="text-foreground">{item.lifestyle}</span></div>
                    <div><span className="text-muted-foreground font-medium">💡 구매 동기:</span> <span className="text-foreground">{item.purchase_motivation}</span></div>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <span className="text-muted-foreground font-medium">👍 만족:</span>
                      {(item.satisfaction_points || []).map((p, j) => <Badge key={j} variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">{p}</Badge>)}
                    </div>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <span className="text-muted-foreground font-medium">👎 불만:</span>
                      {(item.pain_points || []).map((p, j) => <Badge key={j} variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">{p}</Badge>)}
                    </div>
                  </div>
                </div>
              ))}
              {(!ins?.persona_insights?.core_user_groups?.length) && <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>}
            </InsightCard>

            {/* Potential User Group */}
            <div className="mt-3">
              <InsightCard icon={TrendingUp} title={t("Potential User Group", "사용자 확장층")} color="border-success/20 bg-success/5">
                {(ins?.persona_insights?.potential_user_groups || []).map((item, i) => (
                  <div key={i} className="bg-background/60 rounded p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ProductTag name={item.product} />
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">{item.target_group}</Badge>
                      <div className="ml-auto"><CopyBtn text={`[${item.product}] 타깃: ${item.target_group}\n예상 사용씬: ${item.expected_use_scenes?.join(", ")}\n관심사: ${item.interests?.join(", ")}\n라이프스타일: ${item.lifestyle_context}\n크리에이티브 방향: ${item.creative_direction}`} /></div>
                    </div>
                    <div className="grid gap-1.5 text-xs">
                      <div><span className="text-muted-foreground font-medium">🎬 예상 사용씬:</span> <span className="text-foreground">{item.expected_use_scenes?.join(" · ") || "—"}</span></div>
                      <div><span className="text-muted-foreground font-medium">💎 관심사:</span> <span className="text-foreground">{item.interests?.join(" · ") || "—"}</span></div>
                      <div><span className="text-muted-foreground font-medium">🧬 라이프스타일:</span> <span className="text-foreground">{item.lifestyle_context}</span></div>
                      <div className="bg-primary/5 border border-primary/15 rounded p-2 mt-1">
                        <span className="text-muted-foreground font-medium text-[11px]">💬 메시지/크리에이티브 방향:</span>
                        <p className="text-xs text-foreground mt-0.5">{item.creative_direction}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!ins?.persona_insights?.potential_user_groups?.length) && <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>}
              </InsightCard>
            </div>

            {/* JTBD */}
            <div className="mt-4 space-y-3">
              <div className="bg-muted/40 border border-border rounded-lg p-3 flex items-start gap-2">
                <Briefcase className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">JTBD (Jobs to be Done)</strong>{" "}
                  {t("— What 'job' are customers hiring this product to solve?", "— 고객이 이 제품을 '고용'해서 해결하려는 과제는?")}
                </p>
              </div>

              <InsightCard icon={ShieldAlert} title={t("Pre-Purchase Anxiety", "구매 전 불안 요소")} color="border-orange-500/20 bg-orange-500/5">
                {(ins?.jtbd_insights?.anxiety || []).map((item, i) => (
                  <div key={i} className="bg-background/60 rounded p-2.5 flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2"><ProductTag name={item.product} /><SeverityBadge level={item.frequency} /></div>
                      <p className="text-xs text-foreground">{item.concern}</p>
                    </div>
                    <CopyBtn text={`[${item.product}] 불안요소: ${item.concern} (${item.frequency})`} />
                  </div>
                ))}
                {(!ins?.jtbd_insights?.anxiety?.length) && <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>}
              </InsightCard>

              <InsightCard icon={Heart} title={t("Post-Purchase Delight", "사용 후 안도감")} color="border-green-500/20 bg-green-500/5">
                {(ins?.jtbd_insights?.delight || []).map((item, i) => (
                  <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                    <div className="flex items-center justify-between"><ProductTag name={item.product} /><CopyBtn text={`[${item.product}] ${item.resolution}\n추천 키워드: ${(item.recommend_words || []).join(", ")}`} /></div>
                    <p className="text-xs text-foreground">{item.resolution}</p>
                    <div className="flex flex-wrap gap-1">
                      {(item.recommend_words || []).map((w, wi) => <Badge key={wi} variant="secondary" className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-700 border-green-500/15">{w}</Badge>)}
                    </div>
                  </div>
                ))}
                {(!ins?.jtbd_insights?.delight?.length) && <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>}
              </InsightCard>

              <InsightCard icon={ArrowRightLeft} title={t("Competitor Switching Points", "경쟁사 이탈 포인트")} color="border-violet-500/20 bg-violet-500/5">
                {(ins?.jtbd_insights?.switching_points || []).map((item, i) => (
                  <div key={i} className="bg-background/60 rounded p-2.5 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ProductTag name={item.product} />
                      <Badge variant="outline" className="text-[10px]">{item.from_competitor} → LG</Badge>
                      <div className="ml-auto"><CopyBtn text={`${item.from_competitor} → LG ${item.product}: ${item.decisive_reason}`} /></div>
                    </div>
                    <p className="text-xs text-foreground">{item.decisive_reason}</p>
                  </div>
                ))}
                {(!ins?.jtbd_insights?.switching_points?.length) && <p className="text-xs text-muted-foreground">{t("No data", "데이터 없음")}</p>}
              </InsightCard>
            </div>

            {results.metadata?.generated_at && (
              <p className="text-[10px] text-muted-foreground text-right mt-3">
                {t("Generated:", "생성:")} {new Date(results.metadata.generated_at).toLocaleString("ko-KR")}
              </p>
            )}
          </div>

          {/* ═══════ SECTION 2: Content Hooks & VoC ═══════ */}
          <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
            <StepHeader step={3} title={t("Content Hooks & VoC", "콘텐츠 훅 & VoC")} subtitle={t("Real review-derived hooks & quotes", "실제 리뷰 기반 검색 인텐트 훅 & VoC")} />

            <SectionLabel>🔍 {t("SEARCH INTENT HOOKS (from reviews)", "검색 인텐트 훅 (리뷰 기반)")}</SectionLabel>
            <div className="space-y-2.5 mb-8">
              {results.hooks.map((h, i) => (
                <div key={i} className="grid grid-cols-[100px_1fr_auto] items-center gap-3 bg-card border border-border rounded-[10px] px-4 py-3">
                  <span className={`text-[11px] rounded-md px-2 py-0.5 font-medium text-center ${
                    h.sentiment === "positive" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}>{h.keyword}</span>
                  <span className="text-[12.5px] text-foreground leading-snug">{h.copy}</span>
                  <button onClick={() => handleCopy(`hook-${i}`, h.copy)} className="text-xs text-muted-foreground hover:text-primary">
                    {copiedMap[`hook-${i}`] ? "✅" : "📋"}
                  </button>
                </div>
              ))}
              {results.hooks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">{t("Not enough keyword data", "키워드 데이터 부족")}</p>}
            </div>

            <SectionLabel>💬 {t("VERIFIED VOC — Real customer quotes", "인증 VOC — 실제 고객 리뷰 인용")}</SectionLabel>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {results.vocs.map((v, i) => (
                <div key={i} className={`bg-card border rounded-xl p-4 flex flex-col gap-2 ${
                  v.sentiment === "positive" ? "border-success/20" : "border-destructive/20"
                }`}>
                  <span className="text-xs">{v.sentiment === "positive" ? "👍 ★★★★★" : "👎 ★★☆☆☆"}</span>
                  <p className="text-[13px] text-foreground leading-relaxed italic flex-1">"{v.quote}"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{v.source}</span>
                    <button onClick={() => handleCopy(`voc-${i}`, v.quote)}
                      className="px-3 py-1 rounded-md border border-border text-[11.5px] font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      {copiedMap[`voc-${i}`] ? "✅ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════ SECTION 3: AI Text Copy ═══════ */}
          <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
            <StepHeader step={4} title={t("AI Text Copy Generation", "AI 텍스트 카피 생성")} subtitle={t("Review-driven · Auto-generated", "리뷰 기반 · 자동 생성")} />

            <div className="border-b-2 border-border mb-5 flex">
              {([["owned", "🏢 Owned Media (LG.com)"], ["paid", "📡 Paid Media"], ["retail", "🛒 Retailers"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setActiveCopyTab(key)}
                  className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] transition-colors ${
                    activeCopyTab === key ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {activeCopyTab === "owned" && (
              <CopyBlock label="🏢 Owned Media — PDP Highlights + FAQ" content={results.copy.owned} id="copy-owned" copiedMap={copiedMap} onCopy={handleCopy} />
            )}
            {activeCopyTab === "paid" && (
              <CopyBlock label="📡 Paid Media — PMax + Meta Ad" content={results.copy.paid} id="copy-paid" copiedMap={copiedMap} onCopy={handleCopy} />
            )}
            {activeCopyTab === "retail" && (
              <CopyBlock label="🛒 Retailers — Amazon A+ + Best Buy" content={results.copy.retail} id="copy-retail" copiedMap={copiedMap} onCopy={handleCopy} />
            )}
          </div>

          {/* ═══════ MEDIA ASSET HANDOFF ═══════ */}
          <div className="gradient-card rounded-xl border border-border p-5 md:p-6">
            <StepHeader step={5} title={t("Media Asset Handoff", "미디어 에셋 핸드오프")} subtitle={t("Image/video/banner · Design prompt", "이미지/영상/배너 · 디자인 프롬프트")} />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {ASSETS.map((a, i) => (
                <div key={i} className="bg-card border border-border rounded-[14px] overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-[90px] flex items-center justify-center relative" style={{ background: a.thumb_bg }}>
                    <span className="text-[32px]">{a.thumb_emoji}</span>
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: a.badge.bg, color: a.badge.color }}>
                      {a.badge.text}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{a.type}</p>
                    <h4 className="text-sm font-bold text-foreground mb-1.5">{a.name}</h4>
                    <p className="text-[11.5px] text-muted-foreground leading-relaxed whitespace-pre-line mb-3.5">{a.spec}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleCopy(`asset-${i}`, a.design_prompt)}
                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                        {copiedMap[`asset-${i}`] ? "✅ Copied!" : "📋 Copy Design Prompt"}
                      </button>
                      <button onClick={() => window.open(a.export_url, "_blank")}
                        className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />{a.export_label}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════ ANITA CREATIVE STUDIO ═══════ */}
          <a href="https://anita-twincrew.lovable.app/studio" target="_blank" rel="noopener noreferrer"
            className="group gradient-card rounded-xl border border-border p-5 md:p-6 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer block">
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
                  {t("Create product lifestyle images & banners in one place.", "제품 라이프스타일 이미지 및 배너를 한 곳에서 제작합니다.")}
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
        </>
      )}
    </div>
  );
}
