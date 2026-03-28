import { useState, useMemo } from "react";
import { ExternalLink, Loader2, Check, Wrench, Search, X, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/contexts/LanguageContext";

// ═══════════════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════════════

const PRODUCTS = [
  { id: 0, name: 'LG OLED65G6WUA · 65" G6', cis: 92, inventory: 158, sales: 1380, rating: 4.9 },
  { id: 1, name: 'LG OLED65G5WUA · 65" G5', cis: 89, inventory: 142, sales: 1243, rating: 4.8 },
  { id: 2, name: 'LG OLED55C5PUA · 55" C5', cis: 82, inventory: 287, sales: 987, rating: 4.7 },
  { id: 3, name: 'LG OLED48C5PUA · 48" C5', cis: 68, inventory: 198, sales: 890, rating: 4.6 },
  { id: 4, name: 'LG OLED77G5WUA · 77" G5', cis: 54, inventory: 45, sales: 234, rating: 4.9 },
  { id: 5, name: 'LG OLED65C6H · 65" C6H Tandem', cis: 85, inventory: 95, sales: 412, rating: 4.8 },
  { id: 6, name: 'LG OLED83W6 · 83" W6 Wireless', cis: 78, inventory: 32, sales: 98, rating: 4.9 },
  { id: 7, name: 'LG UltraGear 27GR83Q-B', cis: 71, inventory: 312, sales: 445, rating: 4.6 },
  { id: 8, name: 'LG UltraGear 32GS95UE', cis: 76, inventory: 189, sales: 378, rating: 4.7 },
  { id: 9, name: 'LG Gram 17Z90TP', cis: 61, inventory: 178, sales: 389, rating: 4.5 },
  { id: 10, name: 'LG Gram Pro 16 2-in-1', cis: 73, inventory: 112, sales: 267, rating: 4.6 },
  { id: 11, name: 'LG Soundbar S95TR', cis: 64, inventory: 134, sales: 289, rating: 4.5 },
  { id: 12, name: 'LG Soundbar S80QY', cis: 58, inventory: 201, sales: 345, rating: 4.4 },
  { id: 13, name: 'LG WashTower WKEX200HBA', cis: 74, inventory: 89, sales: 567, rating: 4.5 },
  { id: 14, name: 'LG CordZero A9 ThinQ', cis: 66, inventory: 245, sales: 412, rating: 4.4 },
  { id: 15, name: 'LG InstaView LRMVS3006S', cis: 70, inventory: 67, sales: 198, rating: 4.6 },
  { id: 16, name: 'LG PuriCare AeroTower', cis: 62, inventory: 156, sales: 223, rating: 4.3 },
  { id: 17, name: 'LG StanbyME 27LX6TYGA', cis: 59, inventory: 88, sales: 145, rating: 4.5 },
];

const EVENTS = [
  // Mega Sales
  "🖤 Black Friday (Nov)", "💻 Cyber Monday (Nov)", "⚡ Prime Day (Jul)", "🛒 Amazon Spring Sale (Mar)",
  // Seasonal
  "🎒 Back to School (Jul–Aug)", "🎄 Holiday Season (Dec)", "💝 Valentine's Day (Feb)", "👨 Father's Day (Jun)",
  "🏠 Home Refresh (Spring)", "🍂 Fall Refresh (Sep–Oct)",
  // Category-specific
  "🎮 Gaming Season (Q4)", "🏈 Super Bowl / Big Game (Feb)", "🏆 FIFA / World Cup Season",
  "📺 New Model Launch (CES Jan)", "📺 Mid-Year Line Refresh (Jun)",
  // Regional
  "🇬🇧 Boxing Day (Dec 26)", "🇨🇦 Canada Day (Jul 1)", "🇩🇪 German Unity Day (Oct)",
  // Clearance
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

const BUDGET_TIERS = [
  "💰 Tier 1 — Hero (>$100K)", "💵 Tier 2 — Priority ($50–100K)",
  "🪙 Tier 3 — Standard ($10–50K)", "🆓 Tier 4 — Organic Only (<$10K)",
];

const PERSONAS = [
  { icon: "🎮", name: "The Gamer", region: "US · AU · DE · 18–34", desc: "High-spec gaming setup. Sensitive to response time & VRR. Active on r/buildapc.", tags: ["Input lag", "VRR", "4K120Hz", "HDMI 2.1"] },
  { icon: "🎬", name: "Home Cinema Fan", region: "UK · CA · US · 35–55", desc: "Values 4K streaming & audio. Embraces Dolby Vision/Atmos. Premium budget.", tags: ["Dolby Vision", "OLED Black", "Atmos", '77"–83"'] },
  { icon: "🏠", name: "Smart Home Adopter", region: "DE · NL · CA · 30–50", desc: "Prioritizes Matter/Thread & energy efficiency. A+++ rating matters. ThinQ ecosystem expansion.", tags: ["ThinQ", "Energy A+++", "Matter", "AI features"] },
];

const DEFENSE_MESSAGES = [
  { icon: "🔥", text: '"Burn-in is a thing of the past — 6,000+ owners, 1.2% incident rate only."', sub: "Burn-in concern 228 cases → FAQ P0 · PDP Section · Remarketing" },
  { icon: "📱", text: '"ThinQ connects in 3 taps — verified by 18,000+ US owners."', sub: "App concern 154 cases → Setup guide · A+ Content" },
  { icon: "💰", text: '"82% of buyers say \'worth every penny\' after 6 months of ownership."', sub: "Price anxiety 198 cases → Value proof · Amazon A+" },
];

const OFFENSE_MESSAGES = [
  { icon: "🖼️", text: '"The moment you turn it on — 74% cite picture quality as life-changing."', sub: "Positive #1 keyword → PDP Hero · PMax creative" },
  { icon: "🎮", text: '"Gamers switch to LG OLED and never look back — 312 gamer reviews say so."', sub: "Gaming NPS 34% above avg → YouTube · Reddit Ads" },
  { icon: "🤫", text: '"Whisper-quiet. 712 owners called it the quietest appliance they own."', sub: "Quiet #2 keyword → Meta video hook · Affiliate" },
];

const HOOKS = [
  { keyword: "best oled tv", copy: '"Rated #1 by 26,000+ verified buyers. See why LG OLED dominates every top list."', score: "CIS 89 · P0" },
  { keyword: "oled burn in", copy: '"Worried about burn-in? So were 6,000 LG OLED owners — 98.8% report zero issues."', score: "CIS 84 · P0" },
  { keyword: "lg vs samsung", copy: '"26,000 owners chose LG. Here\'s exactly why — in their own words."', score: "CIS 79 · P1" },
  { keyword: "gaming tv 4k", copy: '"1ms. 4K120Hz. VRR. The only gaming TV serious players actually recommend."', score: "CIS 82 · P0" },
  { keyword: "black friday tv", copy: '"Now or never — LG OLED\'s lowest price of the year. 26K+ owners say it\'s worth full price."', score: "Seasonal · BF" },
  { keyword: "worst tv brand", copy: '"We saw the complaints about other brands — that\'s why we checked 26,000 LG reviews first."', score: "Defensive · P1" },
];

const VOCS = [
  { quote: "\"I didn't realize how different it would look until I turned it on. Absolutely stunning.\"", source: "Verified · LG.com US · OLED C5" },
  { quote: "\"Worth every single penny. I've had it for 8 months and zero burn-in. Games look incredible.\"", source: "Verified · LG.com US · OLED G5" },
  { quote: "\"Switched from Samsung and I genuinely can't believe I waited this long. The blacks are unreal.\"", source: "Verified · Amazon US · OLED C4" },
  { quote: "\"My whole family said 'wow' the moment the screen came on. Best purchase decision of the year.\"", source: "Verified · Best Buy US" },
  { quote: "\"Setup took 10 minutes. ThinQ works flawlessly with my smart home. Whisper quiet too.\"", source: "Verified · LG.com UK · ThinQ" },
  { quote: "\"As a competitive gamer this is the best investment I've made. Zero input lag, perfect colors.\"", source: "Verified · LG.com US · UltraGear" },
];

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
  faq: {
    label: "❓ AI FAQ for PDP",
    meta: "PDP FAQ Section · CIS P0",
    id: "copy-pdp-faq",
    legal: "pass" as const,
    charInfo: "✅ Legal PASS · evidence ≥2",
    text: `Q. Will I experience burn-in with LG OLED?
A. Among 6,000+ verified long-term owners, only 1.2% reported any visible burn-in. LG OLED Care+ further minimizes risk with automatic pixel management.

Q. Is LG OLED worth the price premium?
A. 82% of verified US buyers rated value positively after ownership. Most common 5-star phrase: "worth every penny."

Q. How does ThinQ smart home integration work?
A. LG ThinQ supports Matter and Thread — compatible with Apple HomeKit, Google Home, and Amazon Alexa out of the box.`,
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

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold shrink-0">
        {step}
      </span>
      <h2 className="text-base font-bold font-heading text-foreground">{title}</h2>
      <span className="text-xs text-muted-foreground ml-auto">{subtitle}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.6px] mb-3">
      {children}
    </p>
  );
}

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
  const { t } = useLang();
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("🇺🇸 US (LGEUS)");
  const [selectedGoal, setSelectedGoal] = useState("🚀 Awareness");
  const [selectedCampaignType, setSelectedCampaignType] = useState("📺 Single Product Focus");
  const [selectedBudget, setSelectedBudget] = useState("💵 Tier 2 — Priority ($50–100K)");

  type SortMode = "inventory" | "sales" | "rated";
  type CopyTab = "owned" | "paid" | "retail";

  const [sortMode, setSortMode] = useState<SortMode>("inventory");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set([0]));
  const [customModelInput, setCustomModelInput] = useState("");
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [activePersona, setActivePersona] = useState(0);
  const [activeCopyTab, setActiveCopyTab] = useState<CopyTab>("owned");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedMap((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 1800);
  };

  const sortedProducts = useMemo(() => {
    return [...PRODUCTS].sort((a, b) => {
      if (sortMode === "inventory") return b.inventory - a.inventory;
      if (sortMode === "sales") return b.sales - a.sales;
      return b.rating - a.rating;
    });
  }, [sortMode]);

  const toggleProduct = (id: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Wrench}
        title="🚀 Global Marketing Toolkit"
        description={t(
          "Auto-generates campaign content based on real customer review data. Set product selection, target market, and marketing goal to get ready-to-use copy and banner assets.",
          "실제 고객 리뷰 데이터를 기반으로 캠페인용 콘텐츠를 자동 생성합니다. 제품 선택, 타겟 시장, 마케팅 목표를 설정하면 바로 활용 가능한 카피와 배너 소재를 제공합니다."
        )}
      />

      {/* ═══════ STEP 1 ═══════ */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <StepHeader step={1} title={t("Campaign Context", "캠페인 컨텍스트")} subtitle={t("Seasonal event & product selection · Korea excluded", "시즌 이벤트 & 제품 선택 · 한국 제외")} />

        <SectionLabel>{t("GLOBAL SEASONAL EVENT", "글로벌 시즌 이벤트")}</SectionLabel>
        <div className="flex gap-3.5 mb-4 flex-wrap">
          <SelectDropdown label={t("SEASONAL EVENT", "시즌 이벤트")} value={selectedEvent} options={EVENTS} placeholder={t("— Select Season —", "— 시즌 선택 —")} onChange={setSelectedEvent} />
          <SelectDropdown label={t("TARGET MARKET", "타겟 시장")} value={selectedMarket} options={MARKETS} onChange={setSelectedMarket} />
          <SelectDropdown label={t("CAMPAIGN GOAL", "캠페인 목표")} value={selectedGoal} options={GOALS} onChange={setSelectedGoal} />
        </div>

        <SectionLabel>{t("CAMPAIGN SETUP", "캠페인 설정")}</SectionLabel>
        <div className="flex gap-3.5 mb-6 flex-wrap">
          <SelectDropdown label={t("CAMPAIGN TYPE", "캠페인 유형")} value={selectedCampaignType} options={CAMPAIGN_TYPES} onChange={setSelectedCampaignType} />
          <SelectDropdown label={t("BUDGET TIER", "예산 등급")} value={selectedBudget} options={BUDGET_TIERS} onChange={setSelectedBudget} />
        </div>

        <SectionLabel>{t("PRODUCT SELECTION", "제품 선택")}</SectionLabel>
        <div className="flex items-center gap-0 mb-3.5 border border-border rounded-[10px] overflow-hidden w-fit">
          {([["inventory", "📦 High Inventory"], ["sales", "🏆 Best Seller"], ["rated", "⭐ Top Rated"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortMode(key)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                sortMode === key ? "bg-primary text-white font-semibold" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 mt-3.5">
          {sortedProducts.map((p) => {
            const sel = selectedProducts.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleProduct(p.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] border text-left transition-all ${
                  sel ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary"
                }`}
              >
                <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  CIS {p.cis}
                </span>
                <span className="flex-1 text-xs font-medium text-foreground leading-tight truncate">{p.name}</span>
                <span className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 text-[10px] ${
                  sel ? "bg-primary border-primary text-white" : "border-muted"
                }`}>
                  {sel && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11.5px] text-muted-foreground mt-2">{t("Click to select (multi-select enabled)", "클릭하여 선택 (복수 선택 가능)")}</p>

        {/* Custom Model Input */}
        <div className="mt-5 p-4 rounded-xl border border-border bg-card">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1px] mb-2.5">
            ✏️ {t("ADD CUSTOM PRODUCT / MODEL NUMBER", "제품명 / 모델번호 직접 입력")}
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customModelInput.trim()) {
                    setCustomModels((prev) => [...prev, customModelInput.trim()]);
                    setCustomModelInput("");
                  }
                }}
                placeholder={t("e.g. OLED65C4PUA, WashTower, UltraGear 27GR95QE ...", "예: OLED65C4PUA, WashTower, UltraGear 27GR95QE ...")}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
            <button
              onClick={() => {
                if (customModelInput.trim()) {
                  setCustomModels((prev) => [...prev, customModelInput.trim()]);
                  setCustomModelInput("");
                }
              }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
            >
              {t("Add", "추가")}
            </button>
          </div>
          {customModels.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {customModels.map((model, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-xs font-medium text-foreground"
                >
                  🔍 {model}
                  <button
                    onClick={() => setCustomModels((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-[10.5px] text-muted-foreground mt-2">
            {t("Enter any product name or model number not listed above. Press Enter or click Add.", "위 목록에 없는 제품명 또는 모델번호를 입력하세요. Enter 또는 추가 버튼을 클릭하세요.")}
          </p>
        </div>
      </div>

      {/* ═══════ STEP 2 ═══════ */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <StepHeader step={2} title={t("Global Strategy & Persona", "글로벌 전략 & 페르소나")} subtitle={t("Target persona · JTBD messaging strategy", "타겟 페르소나 · JTBD 메시징 전략")} />

        <SectionLabel>{t("TARGET PERSONA", "타겟 페르소나")}</SectionLabel>
        <div className="grid grid-cols-3 gap-3.5 mb-6">
          {PERSONAS.map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePersona(i)}
              className={`text-left p-5 rounded-xl border transition-all ${
                activePersona === i
                  ? "border-primary bg-primary/5 shadow-[0_4px_16px_rgba(184,50,40,0.08)]"
                  : "border-border bg-card hover:border-primary"
              }`}
            >
              <span className="text-2xl">{p.icon}</span>
              <h4 className="text-sm font-bold text-foreground mt-2.5 mb-1">{p.name}</h4>
              <p className="text-[11px] font-semibold text-primary mb-2">{p.region}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {p.tags.map((t) => (
                  <span key={t} className="text-[10.5px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <SectionLabel>{t("JTBD & KEY MESSAGING", "JTBD & 핵심 메시징")}</SectionLabel>
        <div className="bg-muted/40 border border-border rounded-lg p-3 mb-4 flex items-start gap-2">
          <Briefcase className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">JTBD (Jobs to be Done)</strong>{" "}
            {t(
              "— Focuses on the 'job' customers are trying to accomplish. Instead of asking 'who is the customer?', it asks 'what problem are they hiring this product to solve?'",
              "— 고객이 제품을 '고용'해서 해결하려는 과제에 집중하는 분석법입니다. '누가 사는가'가 아닌 '왜, 어떤 문제를 해결하려고 사는가'를 파악합니다."
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Defense */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <p className="text-[10px] font-bold text-primary uppercase tracking-[1px] mb-3">
              🛡 {t("ANXIETY → DEFENSE (Pre-purchase concern)", "불안 요소 → 디펜스 (구매 전 우려)")}
            </p>
            {DEFENSE_MESSAGES.map((m, i) => (
              <div key={i} className={`flex gap-2 py-2.5 ${i < DEFENSE_MESSAGES.length - 1 ? "border-b border-border/30" : ""}`}>
                <span className="text-sm shrink-0 mt-0.5">{m.icon}</span>
                <div>
                  <p className="text-[13px] text-foreground leading-snug">{m.text}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{m.sub}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Offense */}
          <div className="rounded-xl border border-success/20 bg-success/5 p-5">
            <p className="text-[10px] font-bold text-success uppercase tracking-[1px] mb-3">
              ⚡ {t("DELIGHT → OFFENSE (Post-purchase satisfaction)", "만족 포인트 → 오펜스 (구매 후 만족)")}
            </p>
            {OFFENSE_MESSAGES.map((m, i) => (
              <div key={i} className={`flex gap-2 py-2.5 ${i < OFFENSE_MESSAGES.length - 1 ? "border-b border-border/30" : ""}`}>
                <span className="text-sm shrink-0 mt-0.5">{m.icon}</span>
                <div>
                  <p className="text-[13px] text-foreground leading-snug">{m.text}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{m.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ STEP 3 ═══════ */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <StepHeader step={3} title={t("Content Hooks & VoC", "콘텐츠 훅 & VoC")} subtitle={t("Search intent ad hooks · Verified customer quotes", "검색 인텐트 광고 훅 · 인증 고객 리뷰 인용")} />

        <SectionLabel>🔍 {t("SEARCH INTENT HOOKS", "검색 인텐트 훅")}</SectionLabel>
        <div className="space-y-2.5 mb-8">
          {HOOKS.map((h, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr_auto] items-center gap-3 bg-card border border-border rounded-[10px] px-4 py-3">
              <span className="text-[11px] bg-secondary rounded-md px-2 py-0.5 font-medium text-muted-foreground text-center">{h.keyword}</span>
              <span className="text-[12.5px] text-foreground leading-snug">{h.copy}</span>
              <span className="text-[11px] font-bold text-success whitespace-nowrap">{h.score}</span>
            </div>
          ))}
        </div>

        <SectionLabel>💬 {t("VERIFIED VOC — Ready-to-use 1-line English reviews", "인증 VOC — 바로 활용 가능한 1줄 영문 리뷰")}</SectionLabel>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {VOCS.map((v, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-primary transition-colors">
              <span className="text-xs text-warning">★★★★★</span>
              <p className="text-[13px] text-foreground leading-relaxed italic flex-1">{v.quote}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{v.source}</span>
                <button
                  onClick={() => handleCopy(`voc-${i}`, v.quote)}
                  className="px-3 py-1 rounded-md border border-border text-[11.5px] font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {copiedMap[`voc-${i}`] ? "✅ Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ STEP 4 ═══════ */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <StepHeader step={4} title={t("AI Text Copy Generation", "AI 텍스트 카피 생성")} subtitle={t("Channel-specific auto-generation · Legal pre-review included", "채널별 자동 생성 · 법률 사전 검토 포함")} />

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
          <>
            <CopyBlock {...OWNED_COPY.bullets} content={OWNED_COPY.bullets.text} charInfo={OWNED_COPY.bullets.charInfo} legalStatus={OWNED_COPY.bullets.legal} copiedMap={copiedMap} onCopy={handleCopy} />
            <CopyBlock {...OWNED_COPY.faq} content={OWNED_COPY.faq.text} charInfo={OWNED_COPY.faq.charInfo} legalStatus={OWNED_COPY.faq.legal} copiedMap={copiedMap} onCopy={handleCopy} />
          </>
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

      {/* ═══════ STEP 5 ═══════ */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <StepHeader step={5} title={t("Media Asset Handoff", "미디어 에셋 핸드오프")} subtitle={t("Image/video/banner external tool integration · Auto design prompt", "이미지/영상/배너 외부 툴 연동 · 자동 디자인 프롬프트")} />

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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HELPER — SelectDropdown
// ═══════════════════════════════════════════════════════════════

function SelectDropdown({
  label, value, options, placeholder, onChange,
}: {
  label: string; value: string; options: string[]; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.6px]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[200px] px-3.5 py-2.5 rounded-[10px] border border-border bg-card text-[13.5px] text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
