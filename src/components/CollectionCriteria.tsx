import { Database, Calendar, MessageSquare, ShieldCheck, Languages, TrendingUp, MapPin, AlertTriangle, Brain, Users, Zap, Search, HelpCircle, Scale } from "lucide-react";
import { useState, useEffect } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface CriteriaItem {
  icon: typeof Database;
  titleEn: string;
  titleKo: string;
  itemsEn: string[];
  itemsKo: string[];
}

// Live collection counts hook (auto-refresh every 30s + realtime)
function useLgComCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetch = () => {
      supabase.rpc("get_lgcom_country_counts").then((countRes) => {
        const data = countRes.data || [];
        const map: Record<string, number> = {};
        data.forEach((d: any) => { map[d.country] = Number(d.count || 0); });
        setCounts(map);
      });
    };
    fetch();
    const interval = setInterval(fetch, 30_000);
    const channel = supabase.channel("lgcom-counts").on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, fetch).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);
  return counts;
}

// Normalize BV category codes to readable names
const CATEGORY_LABEL_MAP: Record<string, string> = {
  "General": "General", "TV": "TV", "OLED TV": "TV",
  "Washer": "Washer", "Washing Machine": "Washer",
  "Refrigerator": "Refrigerator", "Dryer": "Dryer",
  "Monitor": "Monitor", "Audio": "Audio", "Soundbar": "Audio",
  "Air Conditioner": "Air Conditioner", "LG art cool": "Air Conditioner",
  "Laptop": "Laptop", "Air Purifier": "Air Purifier",
  "Microwave": "Microwave", "Projector": "Projector",
  "Dishwasher": "Dishwasher", "Vacuum": "Vacuum", "Robot Vacuum": "Vacuum",
  "Styler": "Styler",
  // BV category codes
  "CT52002425": "Washer", "CT52000826": "Refrigerator",
  "CT52001903": "Dryer", "CT52001906": "Dishwasher",
  "CT52000821": "TV", "CT52001900": "Air Conditioner",
  "CT00008334": "Monitor", "CT00008363": "Audio",
  "C_APPLIANCE_WASHER_DRYER": "Washer/Dryer",
  "CT10000018": "Refrigerator", "CT52000823": "Microwave",
  "C_APPLIANCE_AIR_CARE": "Air Purifier",
  "CT52006585": "Vacuum", "CT52001901": "Range/Oven",
  "CT52000179": "TV", "CT52000182": "Audio",
  "CT52000129": "Laptop", "CT10000010": "Monitor",
  "CT52006087": "Projector", "C_TV_AUDIO_VIDEO_TV_SOUNDBAR": "Audio",
  "CT10000016": "Air Conditioner", "C_COMPUTING_LAPTOP": "Laptop",
  "CT52006086": "Vacuum", "CT41000491": "Styler",
  "CT52106203": "Dishwasher", "CT52006634": "Range/Oven",
   "CT52006085": "Air Purifier", "CT10000011": "Laptop",
   "C_APPLIANCE_DISHWASHER": "Dishwasher", "C_APPLIANCE_VACUUM_CLEANER": "Vacuum",
   "AI Core Tech": "General", "App": "General", "Remote": "General", "Phone": "General",
};

const CATEGORY_ICONS: Record<string, string> = {
  "TV": "📺", "세탁기": "🧺", "냉장고": "🧊", "건조기": "🌀",
  "모니터": "🖥️", "오디오": "🔊", "에어컨": "❄️", "노트북": "💻",
  "공기청정기": "🌬️", "전자레인지": "♨️", "프로젝터": "📽️",
  "식기세척기": "🍽️", "청소기": "🧹", "세탁건조기": "🔄",
  "오븐/레인지": "🍳", "스타일러": "👔", "쿡탑": "🍳",
  "액세서리": "🔌", "가전 번들": "📦", "스마트폰": "📱",
  "General": "📦",
};

// 영문 카테고리 → 한글 표시 라벨 통합 (DB 값 그대로, 표시만 합산)
const CATEGORY_KO: Record<string, string> = {
  "TV": "TV", "세탁기": "세탁기", "냉장고": "냉장고", "건조기": "건조기",
  "모니터": "모니터", "오디오": "오디오", "에어컨": "에어컨", "노트북": "노트북",
  "공기청정기": "공기청정기", "전자레인지": "전자레인지", "프로젝터": "프로젝터",
  "식기세척기": "식기세척기", "청소기": "청소기", "세탁건조기": "세탁건조기",
  "오븐/레인지": "오븐/레인지", "스타일러": "스타일러", "General": "미분류",
  "액세서리": "액세서리", "스마트폰": "스마트폰", "쿡탑": "쿡탑",
  "가전 번들": "가전 번들",
  // 영문 표기를 동일 한글 라벨로 매핑 (DB 마이그레이션 없이 표시만 통합)
  "Refrigerator": "냉장고", "Washer": "세탁기", "Dryer": "건조기",
  "Dishwasher": "식기세척기", "Vacuum": "청소기",
  "Air Conditioner": "에어컨", "Air Purifier": "공기청정기",
  "Audio": "오디오", "Monitor": "모니터", "Microwave": "전자레인지",
  "Range/Oven": "오븐/레인지", "Laptop": "노트북", "Projector": "프로젝터",
  "Styler": "스타일러", "Accessory": "액세서리",
};

/** 영문/한글 카테고리 카운트를 한글 라벨 기준으로 병합 */
function mergeCategoryCountsByKo(
  rows: { category: string; count: number }[],
): { category: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const koKey = CATEGORY_KO[r.category] || r.category;
    map.set(koKey, (map.get(koKey) || 0) + r.count);
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

const PIE_COLORS = [
  "#A91D3A", "#0D9488", "#7C3AED", "#D97706", "#2563EB",
  "#059669", "#DC2626", "#6366F1", "#EA580C", "#0891B2",
  "#4F46E5", "#65A30D", "#BE185D", "#1D4ED8", "#9333EA",
  "#78716C",
];

// Live category collection counts hook (auto-refresh every 30s + realtime)
function useCategoryCounts() {
  const [counts, setCounts] = useState<{ category: string; count: number }[]>([]);
  useEffect(() => {
    const fetchData = () => {
      supabase.rpc("get_category_counts").then((res) => {
        const data = (res.data || []) as { category: string; count: number }[];
        const agg: Record<string, number> = {};
        data.forEach((d) => {
          const normalized = CATEGORY_LABEL_MAP[d.category] || d.category;
          agg[normalized] = (agg[normalized] || 0) + Number(d.count || 0);
        });
        const sorted = Object.entries(agg)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count);
        setCounts(sorted);
      });
    };
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    const channel = supabase.channel("cat-counts").on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, fetchData).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);
  return counts;
}

// Live country collection counts hook (auto-refresh every 30s + realtime)
function useAllCountryCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchData = () => {
      supabase.rpc("get_country_counts").then((res) => {
        const data = res.data || [];
        const map: Record<string, number> = {};
        data.forEach((d: any) => { map[d.country] = Number(d.count || 0); });
        setCounts(map);
      });
    };
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    const channel = supabase.channel("country-counts").on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, fetchData).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);
  return counts;
}

// ISO → LGE RIS code mapping (source: ris.lge.com/SearchSubsidiaryCmd.laf)
const ISO_TO_LGE: Record<string, string> = {
  US: "LGEUS", UK: "LGEUK", DE: "LGEDE", AU: "LGEAP", IN: "LGEIL",
  TH: "LGETH", TW: "LGETT", JP: "LGEJP", SG: "LGESL", MY: "LGEML",
  ID: "LGEIN", PH: "LGEPH", VN: "LGEVN", HK: "LGEHK", CA: "LGECI",
  BR: "LGESP", MX: "LGEMS", FR: "LGEFS",
};

const LGE_FLAGS: Record<string, string> = {
  LGEUS: "🇺🇸", LGEUK: "🇬🇧", LGEJP: "🇯🇵", LGESL: "🇸🇬", LGEML: "🇲🇾", LGEIN: "🇮🇩",
  LGETH: "🇹🇭", LGEPH: "🇵🇭", LGEVN: "🇻🇳", LGETT: "🇹🇼", LGEHK: "🇭🇰", LGEIL: "🇮🇳",
  LGEDE: "🇩🇪", LGEFS: "🇫🇷", LGEAP: "🇦🇺", LGECI: "🇨🇦", LGESP: "🇧🇷", LGEMS: "🇲🇽",
  Global: "🌐", Other: "🔹",
};

const BV_AVAILABLE: Record<string, number> = {
  LGEUS: 121353, LGEUK: 68862, LGEDE: 41097, LGEAP: 17842, LGEIL: 7761, LGETH: 5503, LGETT: 4633, LGEJP: 1322,
};

// Channel data organized by product category
interface ChannelEntry {
  platform: string;
  descEn: string;
  descKo: string;
  countries: string;
}

interface CategoryChannels {
  icon: string;
  labelEn: string;
  labelKo: string;
  channels: ChannelEntry[];
}

const CATEGORY_CHANNELS: CategoryChannels[] = [
  {
    icon: "📺",
    labelEn: "TV · Display · Audio",
    labelKo: "TV · 디스플레이 · 오디오",
    channels: [
      { platform: "lg.com (BV)", descEn: "Official product reviews via Bazaarvoice API", descKo: "Bazaarvoice API 기반 공식 리뷰", countries: "LGEUS, LGEUK, LGEIL, LGETT, LGEJP, LGETH, LGEDE, LGEAP" },
      { platform: "Reddit", descEn: "r/OLED, r/hometheater, r/4kTV, r/soundbars", descKo: "r/OLED, r/hometheater, r/4kTV, r/soundbars", countries: "LGEUS (주력), Global" },
      { platform: "RTINGS", descEn: "Lab measurements & professional test results", descKo: "랩 측정 및 전문 테스트 결과", countries: "Global" },
      { platform: "Amazon", descEn: "Verified Purchase reviews", descKo: "Verified Purchase 리뷰", countries: "LGEUS, LGEUK, LGEDE, LGEIL, LGEJP, LGECI, LGEFS, LGESL" },
      { platform: "Best Buy", descEn: "Retail reviews & ratings (Public API)", descKo: "리테일 리뷰 및 평점 (공개 API)", countries: "LGEUS" },
      { platform: "YouTube", descEn: "Review & unboxing video comments", descKo: "리뷰 및 언박싱 영상 댓글", countries: "LGEUS, LGEUK, LGEAP, LGEJP, LGEIL, LGESL, LGETH 등 13개국" },
      { platform: "CNET · TechRadar", descEn: "Editor reviews & Editor's Choice ratings", descKo: "에디터 리뷰 및 에디터 초이스 평가", countries: "Global" },
      { platform: "SoundGuys", descEn: "Audio product specialist reviews & measurements", descKo: "오디오 제품 전문 리뷰 및 측정", countries: "Global" },
    ],
  },
  {
    icon: "🧊",
    labelEn: "Refrigerator · Kitchen Appliance",
    labelKo: "냉장고 · 주방 가전",
    channels: [
      { platform: "lg.com (BV)", descEn: "InstaView, French Door, Side-by-Side reviews", descKo: "InstaView, French Door, Side-by-Side 리뷰", countries: "LGEUS, LGEUK, LGEIL, LGEDE, LGEAP, LGETH, LGETT, LGEJP" },
      { platform: "Amazon", descEn: "Refrigerator, Range, Microwave, Dishwasher reviews", descKo: "냉장고, 레인지, 전자레인지, 식기세척기 리뷰", countries: "LGEUS, LGEUK, LGEDE, LGEIL" },
      { platform: "Consumer Reports", descEn: "Reliability ratings & lab test reviews", descKo: "신뢰성 평가 및 랩 테스트 리뷰", countries: "LGEUS" },
      { platform: "This Old House", descEn: "Top Pick & comparison reviews", descKo: "Top Pick 및 비교 리뷰", countries: "LGEUS" },
      { platform: "Designer Appliances", descEn: "Expert in-depth blog reviews", descKo: "전문가 심층 블로그 리뷰", countries: "LGEUS" },
      { platform: "ConsumerAffairs", descEn: "Consumer complaint & review platform", descKo: "소비자 불만 및 리뷰 플랫폼", countries: "LGEUS" },
      { platform: "Houzz", descEn: "Home improvement community reviews", descKo: "홈 인테리어 커뮤니티 리뷰", countries: "LGEUS" },
    ],
  },
  {
    icon: "🧺",
    labelEn: "Washer · Dryer · Laundry",
    labelKo: "세탁기 · 건조기 · 세탁",
    channels: [
      { platform: "lg.com (BV)", descEn: "WashTower, TurboWash, Heat Pump Dryer reviews", descKo: "WashTower, TurboWash, 히트펌프 건조기 리뷰", countries: "LGEUS, LGEUK, LGEIL, LGEDE, LGEAP, LGETH, LGETT, LGEJP" },
      { platform: "Reddit", descEn: "r/Appliances, r/BuyItForLife", descKo: "r/Appliances, r/BuyItForLife", countries: "LGEUS, Global" },
      { platform: "Consumer Reports", descEn: "Washer/Dryer reliability & lab tests", descKo: "세탁기/건조기 신뢰성 및 랩 테스트", countries: "LGEUS" },
      { platform: "Wirecutter (NYT)", descEn: "Expert recommendation articles (public only)", descKo: "전문 추천 아티클 (공개 영역만)", countries: "LGEUS" },
      { platform: "Best Buy · Walmart · Target", descEn: "Retail channel VOC (Public API)", descKo: "유통 채널 VOC (공개 API)", countries: "LGEUS" },
      { platform: "Shopee · Lazada", descEn: "SE Asia e-commerce reviews (Firecrawl)", descKo: "동남아 이커머스 리뷰 (Firecrawl)", countries: "LGESL, LGEML, LGEPH, LGETH, LGEIN, LGEVN" },
    ],
  },
  {
    icon: "❄️",
    labelEn: "Air Conditioner · Air Purifier",
    labelKo: "에어컨 · 공기청정기",
    channels: [
      { platform: "lg.com (BV)", descEn: "Artcool, Dual Inverter, PuriCare reviews", descKo: "Artcool, Dual Inverter, PuriCare 리뷰", countries: "LGEUS, LGEUK, LGEIL, LGEDE, LGEAP, LGETH, LGETT, LGEJP" },
      { platform: "Reddit", descEn: "r/Appliances, r/HVAC, r/AirPurifiers", descKo: "r/Appliances, r/HVAC, r/AirPurifiers", countries: "LGEUS, Global" },
      { platform: "Amazon", descEn: "AC & air purifier Verified Purchase reviews", descKo: "에어컨 및 공기청정기 Verified Purchase 리뷰", countries: "LGEUS, LGEUK, LGEIL, LGEDE" },
      { platform: "Trustpilot", descEn: "Consumer reviews for appliances & services", descKo: "가전·서비스 소비자 직접 리뷰", countries: "Global" },
    ],
  },
  {
    icon: "💻",
    labelEn: "Laptop · Monitor · Computing",
    labelKo: "노트북 · 모니터 · 컴퓨팅",
    channels: [
      { platform: "lg.com (BV)", descEn: "LG Gram, UltraGear, MyView, DualUp reviews", descKo: "LG Gram, UltraGear, MyView, DualUp 리뷰", countries: "LGEUS, LGEUK, LGEDE, LGEAP, LGEJP" },
      { platform: "Reddit", descEn: "r/LGgram, r/ultrawidemasterrace, r/buildapc, r/monitors", descKo: "r/LGgram, r/ultrawidemasterrace, r/buildapc, r/monitors", countries: "LGEUS, Global" },
      { platform: "Notebookcheck", descEn: "In-depth laptop reviews & performance data", descKo: "노트북 심층 리뷰 및 성능 데이터", countries: "Global" },
      { platform: "Tom's Hardware", descEn: "Monitor & laptop benchmark reviews", descKo: "모니터 및 노트북 벤치마크 리뷰", countries: "Global" },
      { platform: "PCMag", descEn: "Professional tech product reviews & ratings", descKo: "전문 테크 제품 리뷰 및 평가", countries: "Global" },
      { platform: "Trusted Reviews", descEn: "Editor reviews for monitors & laptops", descKo: "모니터·노트북 에디터 리뷰", countries: "LGEUK" },
    ],
  },
  {
    icon: "🧹",
    labelEn: "Vacuum · Robot · Small Appliance",
    labelKo: "청소기 · 로봇 · 소형 가전",
    channels: [
      { platform: "lg.com (BV)", descEn: "CordZero, Robot Vacuum reviews", descKo: "CordZero, 로봇청소기 리뷰", countries: "LGEUS, LGEUK, LGEDE, LGEAP, LGETH, LGETT, LGEJP" },
      { platform: "Amazon", descEn: "Vacuum & small appliance reviews", descKo: "청소기 및 소형 가전 리뷰", countries: "LGEUS, LGEUK, LGEDE, LGEIL, LGEJP" },
      { platform: "BestReviews", descEn: "Appliance & projector recommendation reviews", descKo: "가전·프로젝터 종합 추천 리뷰", countries: "LGEUS" },
      { platform: "Shopee · Lazada", descEn: "SE Asia e-commerce reviews (Firecrawl)", descKo: "동남아 이커머스 리뷰 (Firecrawl)", countries: "LGESL, LGEML, LGEPH, LGETH, LGEIN, LGEVN" },
    ],
  },
  {
    icon: "🌐",
    labelEn: "Cross-Category · Community · Global",
    labelKo: "크로스 카테고리 · 커뮤니티 · 글로벌",
    channels: [
      { platform: "Reddit r/LG_UserHub", descEn: "Display division community (TV, Audio, Monitor, PC)", descKo: "디스플레이본부 운영 커뮤니티 (TV, 오디오, 모니터, PC)", countries: "Global" },
      { platform: "Reddit r/StanbyME", descEn: "StanbyME dedicated community (NEW)", descKo: "StanbyME 전용 커뮤니티 (신규)", countries: "Global" },
      { platform: "Google Reviews/Maps", descEn: "LG store & service center reviews", descKo: "LG 스토어 및 서비스센터 리뷰", countries: "Global" },
      { platform: "LG Community", descEn: "Official LG community forum discussions", descKo: "LG 공식 커뮤니티 포럼 토론", countries: "Global" },
      { platform: "Lemon8", descEn: "Social platform product reviews & lifestyle", descKo: "소셜 플랫폼 제품 리뷰 및 라이프스타일", countries: "Global" },
      { platform: "Reviews.io", descEn: "Consumer reviews platform", descKo: "소비자 리뷰 플랫폼", countries: "Global, LGEJP, LGETT, LGEHK" },
      { platform: "ComplaintsBoard", descEn: "Consumer complaints platform (incl. Middle East)", descKo: "소비자 불만 플랫폼 (중동 포함)", countries: "Global" },
      { platform: "Quora", descEn: "Product experience Q&A discussions", descKo: "제품 경험 Q&A 토론", countries: "Global" },
      { platform: "Stack Exchange", descEn: "Technical Q&A for product troubleshooting", descKo: "제품 기술 Q&A", countries: "Global" },
      { platform: "Costco", descEn: "Member product reviews", descKo: "회원 제품 리뷰", countries: "LGEUS" },
    ],
  },
];

const criteria: CriteriaItem[] = [
  {
    icon: Search,
    titleEn: "Expanded Keyword Taxonomy (6 Categories)",
    titleKo: "확장 키워드 분류체계 (6개 카테고리)",
    itemsEn: [
      "1️⃣ Product Name · Model: Official names + abbreviations + shorthand (e.g., LG Gram, Gram16, G16, OLED C4, UltraGear, WashTower, StanbyME)",
      "2️⃣ Feature · Spec: battery, heat, performance, picture quality, brightness, weight, firmware, bug, stuttering, noise, energy efficiency, HDR, refresh rate, burn-in",
      "3️⃣ Sentiment · Attitude: Positive (recommend, satisfied, impressive, must-have) / Negative (disappointed, refund, defective, avoid) / Mixed (expensive but good, great except for)",
      "4️⃣ Comparison · Alternative: better than, switched from, alternative to, SS vs LG, upgrade from, do not recommend",
      "5️⃣ Problem · Desire: wish it had, needs improvement, fix this, missing feature, deal breaker, frustrating",
      "All keywords are standardized in English regardless of source language",
    ],
    itemsKo: [
      "1️⃣ 제품명·모델명: 정식 명칭 + 약어 + 줄임말 (예: LG 그램, Gram16, G16, OLED C4, UltraGear, WashTower, StanbyME)",
      "2️⃣ 기능·스펙: 배터리, 발열, 성능, 화질, 밝기, 무게, 펌웨어, 버그, 끊김, 소음, 에너지효율, HDR, 주사율, 번인",
      "3️⃣ 감정·태도: 긍정 (추천, 만족, 인상적, 필수템) / 부정 (실망, 환불, 불량, 비추) / 혼합 (비싸지만 좋다, 좋은데 아쉬운)",
      "4️⃣ 비교·대체: A보다 B가 낫다, A에서 B로 바꿨다, 대체제, SS vs LG, 업그레이드, 추천 안 함",
      "5️⃣ 문제·욕구: 이 기능 있으면 좋겠다, 개선 필요, 버그 수정, 빠진 기능, 결정적 단점, 불편",
      "모든 키워드는 소스 언어에 관계없이 영문 기준으로 통일",
    ],
  },
  {
    icon: Zap,
    titleEn: "Query Generation Rules (Context-Aware)",
    titleKo: "쿼리 생성 규칙 (문맥 인식)",
    itemsEn: [
      "A. Intent + Quantitative: [Brand/Model] + review|ratings|\"verified purchase\" + [feature/issue] + [metric: hours|nits|dB|W|Hz|ms]",
      "B. Pain Point Tracking — TV: burn-in, uniformity, green tint, brightness SDR/HDR | AC: cooling speed, noise dB, Dual Inverter | Monitor: backlight bleed, response time, overshoot, VRR",
      "C. Trust Signals — Amazon/BestBuy: 'Verified Purchase' or helpful votes | Reddit: upvotes | RTINGS: 'test results' or lab measurements",
      "D. Competitor Comparison — SS vs LG, SN vs LG, switched from, upgrade from, alternative to (competitor names shown as initials only)",
      "E. Time Filter — Past 24 hours (default, KST) or since last collection timestamp (dedup)",
      "F. Fallback — If model name is ambiguous, use category + core issue keywords as backup query",
    ],
    itemsKo: [
      "A. 의도형 + 정량형 결합: [브랜드/모델] + review|ratings|\"verified purchase\" + [기능/이슈] + [정량 키워드: hours|nits|dB|W|Hz|ms]",
      "B. Pain Point 추적 — TV: burn-in, uniformity, green tint, brightness SDR/HDR | AC: cooling speed, noise dB, Dual Inverter | 모니터: backlight bleed, response time, overshoot, VRR",
      "C. 신뢰도 시그널 — Amazon/BestBuy: 'Verified Purchase' 또는 helpful votes | Reddit: upvotes | RTINGS: 'test results' 또는 lab measurements",
      "D. 경쟁사 비교 — SS vs LG, SN vs LG, switched from, upgrade from, alternative to (경쟁사명은 이니셜로만 표기)",
      "E. 기간 필터 — 최근 24시간 (기본, KST) 또는 마지막 수집 시각 이후만 (중복 방지)",
      "F. 폴백 — 모델명이 모호할 때 카테고리 + 핵심 이슈 키워드만으로 백오프 쿼리",
    ],
  },
  {
    icon: Brain,
    titleEn: "AI Analysis Pipeline (FCO Sentiment + 6-in-1 + Enhanced Extraction)",
    titleKo: "AI 분석 파이프라인 (FCO 감성분석 + 6-in-1 + 강화 추출)",
    itemsEn: [
      "🧠 FCO (Function-Context-Outcome) Sentiment Analysis — Context-aware sentiment classification beyond surface-level keyword matching",
      "  → Function Categories: Picture Quality, Gaming, Sound, Smart/AI/OS, Design & Build, Installation & Setup, Reliability & Quality, Value & Price",
      "  → Each sentence decomposed into: Target Function + Usage Context + Result/Evaluation",
      "  → Example: 'Screen too bright at night' → Function: Brightness → Context: Night viewing → Outcome: Discomfort → ❌ Negative",
      "  → Meaning-unit keywords generated: '[Function] – [Insight Phrase]' format (e.g., 'Picture Quality – Deep blacks even in bright rooms')",
      "1️⃣ Expanded Keyword Detection — Detects product names, features/specs, sentiment, comparison, and problem/desire keywords",
      "2️⃣ Brand Relevance Check — Determines if mention is actually about an LG product (brand_relevant: true/false + reason)",
      "3️⃣ Granular Sentiment — 10 emotion categories × intensity 1-5 with emotion_evidence sentence",
      "4️⃣ Noise Filtering — Classifies content as: review / general_mention / advertisement / noise",
      "5️⃣ User Segmentation — Infers user type, region (country code), and platform type",
      "6️⃣ Marketing Message Conversion — Auto-generates copy: positive → recommendation, negative → improvement, mixed → balanced",
      "🆕 Topic Labeling — 27+ topics (picture_quality, brightness, uniformity, motion, HDR, gaming, noise, cooling_speed, etc.)",
      "🆕 Pain Points — { type, snippet, severity 1-5, evidence_value } per review",
      "🆕 Strengths — { feature, snippet } for positive highlights",
      "🆕 Quantitative Claims — nits, dB, W, Hz, ms, hours, BTU, sq ft values with context",
      "🆕 Competitor Mentions — { brand, model, direction +/-, snippet } (competitor names as initials only: SS, SN, etc.)",
      "🆕 Marketing Quotes — 1-2 copy-ready sentences (30-140 chars) per review",
      "🆕 FAQ Candidates — Repeated issues → Q&A format with evidence-based draft answers",
      "🆕 Marketing output: ✅ What customers love most (Top 3) · ❌ Main friction points (Top 3) · 🎯 Key message opportunity",
    ],
    itemsKo: [
      "🧠 FCO (Function-Context-Outcome) 감성 분석 — 단어 표면이 아닌 문장 맥락 + 제품 기능 + 사용 결과를 종합한 감성 판별",
      "  → 기능 카테고리: 화질(Picture Quality), 게이밍, 사운드, 스마트/AI/OS, 디자인, 설치, 신뢰성/품질, 가성비",
      "  → 문장별 분해: 대상 기능 + 사용 맥락 + 결과/평가",
      "  → 예시: '밤에 화면이 너무 밝다' → 기능: 밝기 → 맥락: 야간 시청 → 결과: 불편 → ❌ Negative",
      "  → 의미 단위 키워드 생성: '[기능] – [인사이트 문구]' 형식 (예: 'Picture Quality – Deep blacks even in bright rooms')",
      "1️⃣ 확장 키워드 감지 — 리뷰별 제품명, 기능·스펙, 감정, 비교, 문제·욕구 키워드 자동 감지",
      "2️⃣ 브랜드 연관성 판단 — LG 제품 관련 언급인지 자동 판별 (brand_relevant: true/false + 근거 요약)",
      "3️⃣ 감성 세분화 — 10개 감정 카테고리 × 강도 1-5 + 근거 문장(emotion_evidence)",
      "4️⃣ 노이즈 필터링 — 콘텐츠 유형 분류: 실제 평가 / 일반 언급 / 광고 / 노이즈",
      "5️⃣ 사용자 세그먼트 — 사용자 유형, 지역(국가 코드), 플랫폼 유형 추론",
      "6️⃣ 마케팅 메시지 전환 — 자동 카피 생성: 긍정→추천, 부정→개선, 혼합→균형 메시지",
      "🆕 토픽 라벨링 — 27개+ 토픽 다중 선택 (picture_quality, brightness, uniformity, motion, HDR, gaming, noise, cooling_speed 등)",
      "🆕 Pain Points — { type, snippet, severity 1-5, evidence_value } 리뷰별 추출",
      "🆕 Strengths — { feature, snippet } 긍정 하이라이트 추출",
      "🆕 정량 증거 — nits, dB, W, Hz, ms, hours, BTU, sq ft 수치 및 컨텍스트 캡처",
      "🆕 경쟁사 언급 — { brand, model, direction +/-, snippet } (경쟁사명은 이니셜로만 표기: SS, SN 등)",
      "🆕 마케팅 인용 — 리뷰당 1-2개 카피 레디 문장 (30-140자)",
      "🆕 FAQ 후보 — 반복 이슈를 Q&A 형식으로 변환, 근거 기반 답변 초안",
      "🆕 마케팅 출력: ✅ 고객이 가장 좋아하는 점 (Top 3) · ❌ 주요 불만 포인트 (Top 3) · 🎯 핵심 메시지 기회",
    ],
  },
  {
    icon: MapPin,
    titleEn: "Target Regions (20+ Countries)",
    titleKo: "대상 지역 (20개국+)",
    itemsEn: [
      "🇺🇸 United States [LGEUS] — lg.com/us (Bazaarvoice) + Reddit + Amazon + Best Buy + YouTube + Walmart + Target",
      "🇬🇧 United Kingdom [LGEUK] — lg.com/uk (Bazaarvoice) + Amazon UK + YouTube UK + Trusted Reviews",
      "🇩🇪 Germany [LGEDE] — 🆕 lg.com/de (Bazaarvoice) + Amazon DE + YouTube DE + Web Reviews",
      "🇦🇺 Australia [LGEAP] — 🆕 lg.com/au (Bazaarvoice) + YouTube AU + Web Reviews",
      "🇮🇳 India [LGEIL] — 🆕 lg.com/in (Bazaarvoice) + Amazon IN + YouTube IN + Web Reviews",
      "🇯🇵 Japan [LGEJP] — 🆕 lg.com/jp (Bazaarvoice) + Amazon JP + YouTube JP + Web Reviews",
      "🇹🇼 Taiwan [LGETT] — 🆕 lg.com/tw (Bazaarvoice) + Amazon Global + YouTube TW + Reviews.io",
      "🇹🇭 Thailand [LGETH] — 🆕 lg.com/th (Bazaarvoice) + Shopee TH + Lazada TH + YouTube TH",
      "🇧🇷 Brazil [LGESP] — 🆕 lg.com/br (Bazaarvoice) + YouTube BR + Web Reviews",
      "🇸🇬 Singapore [LGESL] — Shopee SG + Lazada SG + YouTube SG + Web Reviews",
      "🇻🇳 Vietnam [LGEVN] — Shopee VN + Lazada VN + YouTube VN + Web Reviews",
      "🇭🇰 Hong Kong [LGEHK] — Amazon Global + YouTube HK + Reviews.io",
      "🌐 Global — Trustpilot + Reviews.io + ComplaintsBoard + PCMag + RTINGS + CNET + TechRadar",
      "📋 수집 예정: 🇲🇾 LGEML · 🇮🇩 LGEIN · 🇵🇭 LGEPH · 🇫🇷 LGEFS · 🇨🇦 LGECI · 🇲🇽 LGEMS",
    ],
    itemsKo: [
      "🇺🇸 미국 [LGEUS] — lg.com/us (Bazaarvoice) + Reddit + Amazon + Best Buy + YouTube + Walmart + Target",
      "🇬🇧 영국 [LGEUK] — lg.com/uk (Bazaarvoice) + Amazon UK + YouTube UK + Trusted Reviews",
      "🇩🇪 독일 [LGEDE] — 🆕 lg.com/de (Bazaarvoice) + Amazon DE + YouTube DE + 웹 리뷰",
      "🇦🇺 호주 [LGEAP] — 🆕 lg.com/au (Bazaarvoice) + YouTube AU + 웹 리뷰",
      "🇮🇳 인도 [LGEIL] — 🆕 lg.com/in (Bazaarvoice) + Amazon IN + YouTube IN + 웹 리뷰",
      "🇯🇵 일본 [LGEJP] — 🆕 lg.com/jp (Bazaarvoice) + Amazon JP + YouTube JP + 웹 리뷰",
      "🇹🇼 대만 [LGETT] — 🆕 lg.com/tw (Bazaarvoice) + Amazon 글로벌 + YouTube TW + Reviews.io",
      "🇹🇭 태국 [LGETH] — 🆕 lg.com/th (Bazaarvoice) + Shopee TH + Lazada TH + YouTube TH",
      "🇧🇷 브라질 [LGESP] — 🆕 lg.com/br (Bazaarvoice) + YouTube BR + 웹 리뷰",
      "🇸🇬 싱가포르 [LGESL] — Shopee SG + Lazada SG + YouTube SG + 웹 리뷰",
      "🇻🇳 베트남 [LGEVN] — Shopee VN + Lazada VN + YouTube VN + 웹 리뷰",
      "🇭🇰 홍콩 [LGEHK] — Amazon 글로벌 + YouTube HK + Reviews.io",
      "🌐 글로벌 — Trustpilot + Reviews.io + ComplaintsBoard + PCMag + RTINGS + CNET + TechRadar",
      "📋 수집 예정: 🇲🇾 LGEML · 🇮🇩 LGEIN · 🇵🇭 LGEPH · 🇫🇷 LGEFS · 🇨🇦 LGECI · 🇲🇽 LGEMS",
    ],
  },
  {
    icon: TrendingUp,
    titleEn: "Selection Logic",
    titleKo: "선정 로직",
    itemsEn: [
      "Primary metric: Reddit annual users by country (WorldPopulationReview) + e-commerce platform activity",
      "Weighting: English-speaking proportion + Asia e-commerce penetration (Shopee/Lazada market share)",
      "Verification: lg.com traffic distribution for CE interest validation (SimilarWeb)",
      "🆕 Asia expansion: Shopee/Lazada GMV rankings, Amazon JP market share, YouTube regional channel engagement",
      "🆕 Middle East: ComplaintsBoard activity for Iraq/GCC region coverage",
    ],
    itemsKo: [
      "1차 지표: Reddit 국가별 연간 사용자 수 (WorldPopulationReview) + 이커머스 플랫폼 활동량",
      "가중치: 영어권/영문 사용 비중 + 아시아 이커머스 침투율 (Shopee/Lazada 시장점유율)",
      "보조 확인: lg.com 트래픽 분포로 CE 관심도 검증 (SimilarWeb)",
      "🆕 아시아 확장: Shopee/Lazada GMV 순위, Amazon JP 점유율, YouTube 지역 채널 참여도",
      "🆕 중동: 이라크/GCC 지역 ComplaintsBoard 활동 기반",
    ],
  },
  {
    icon: Calendar,
    titleEn: "Collection Schedule & Dashboard Sync",
    titleKo: "수집 주기 및 대시보드 동기화",
    itemsEn: [
      "⏰ BV Auto-Collect: 3 automated cron jobs via pg_cron — Sweep (daily 02:00 UTC), Collect (every 6h), Sync (daily 06:00 UTC)",
      "📦 Collect phase: 50 products/batch, priority order — Refrigerator/Washer/Dryer → Dishwasher/Vacuum/AC → Kitchen → Others → TV (lowest)",
      "🔄 Sweep phase: Scans full BV product catalog daily, auto-reopens completed products when new reviews appear",
      "🆕 Sync phase: Incremental sync for reviews submitted in last 25 hours — catches all new reviews daily",
      "🌐 LG.com Bazaarvoice API: 9 countries (US, UK, IN, TW, JP, TH, DE, AU, BR) — No date restriction, all categories, full historical backfill",
      "📦 collect-reviews (Reddit/Amazon/BestBuy etc.) at 07:00 KST → collect-youtube-comments at 07:05 KST",
      "🆕 collect-asian-reviews at 07:10 KST → Firecrawl-based scraping for Shopee/Lazada/Reviews.io/ComplaintsBoard",
      "Trending dashboard updates automatically after each collection cycle (same timing)",
      "Weekly aggregation period: Last 7 days rolling window for trend snapshots & keywords",
      "Based on last 12 months data for long-term analysis (rolling update)",
      "Intensive collection around major sales seasons (Black Friday, CES, etc.)",
    ],
    itemsKo: [
      "⏰ BV 자동 수집: pg_cron 기반 3개 스케줄 — Sweep(매일 02:00 UTC), Collect(6시간마다), Sync(매일 06:00 UTC)",
      "📦 Collect 단계: 50개 제품/배치, 우선순위 — 냉장고/세탁기/건조기 → 식기세척기/청소기/에어컨 → 주방가전 → 기타 → TV(후순위)",
      "🔄 Sweep 단계: 매일 BV 전체 제품 카탈로그 스캔, 신규 리뷰 감지 시 완료 제품도 자동 재오픈",
      "🆕 Sync 단계: 최근 25시간 내 작성된 리뷰 증분 동기화 — 매일 신규 리뷰 누락 없이 수집",
      "🌐 LG.com Bazaarvoice API: 9개국 (US, UK, IN, TW, JP, TH, DE, AU, BR) — 작성시점 제한 없음, 전 카테고리, 과거 리뷰 전량 수집",
      "📦 collect-reviews (Reddit/Amazon/BestBuy 등) 07:00 KST → collect-youtube-comments 07:05 KST 후속 실행",
      "🆕 collect-asian-reviews 07:10 KST 실행 → Shopee/Lazada/Reviews.io/ComplaintsBoard Firecrawl 기반 스크래핑",
      "트렌딩 대시보드는 수집 완료 직후 자동 갱신 (수집 주기 = 대시보드 갱신 주기)",
      "주간 집계 기간: 최근 7일 롤링 윈도우 기준 트렌드 스냅샷 및 키워드 추출",
      "장기 분석을 위한 최근 12개월 데이터 기준 (롤링 업데이트)",
      "주요 세일 시즌(Black Friday, CES 등) 전후 집중 수집",
    ],
  },
  {
    icon: TrendingUp,
    titleEn: "lge.com Inbound Keywords Top 200 (Global + Non-US/NL)",
    titleKo: "lge.com 유입 키워드 Top 200 (글로벌 + 비미국/네덜란드)",
    itemsEn: [
      "🔍 US/Global Top 100: High-traffic keywords from lge.com search analytics — OLED, Gram, UltraGear, Refrigerator, Washer, Dryer, Dishwasher, Air Conditioner, and more",
      "📊 Categories: TV & Display (OLED/QNED/NanoCell), Home Appliances (InstaView/TurboWash/QuadWash), Computing (Gram/UltraGear), Marketing/SEO terms",
      "🌍 Non-US/NL Top 100: Multi-language keywords (excl. US/NL) — Portuguese, Spanish, German — ar condicionado, lava e seca, refrigerador, lavasecadora, waschmaschine, kühlschrank, soundbar, washtower, etc.",
      "🌐 Non-US/NL regions: Brazil (LGESP), Mexico (LGEMS), Germany (LGEDE), and other global markets — last 12 months",
      "These 200 keywords are included in the automated daily collection to capture real search-driven user interest across all markets",
    ],
    itemsKo: [
      "🔍 US/글로벌 Top 100: lge.com 검색 분석 기반 상위 100개 키워드 — OLED, Gram, UltraGear, 냉장고, 세탁기, 건조기, 식기세척기, 에어컨 등",
      "📊 포함 카테고리: TV·디스플레이(OLED/QNED/NanoCell), 생활가전(InstaView/TurboWash/QuadWash), 컴퓨팅(Gram/UltraGear), 마케팅/SEO 용어",
      "🌍 비미국/네덜란드 Top 100: 다국어 키워드 — 포르투갈어, 스페인어, 독일어 — ar condicionado, lava e seca, refrigerador, lavasecadora, waschmaschine, kühlschrank, soundbar, washtower 등",
      "🌐 비미국/네덜란드 대상: 브라질(LGESP), 멕시코(LGEMS), 독일(LGEDE) 등 글로벌 시장 — 최근 12개월 데이터 기반",
      "이 200개 키워드는 실제 검색 기반 사용자 관심을 포착하기 위해 매일 자동 수집에 포함됩니다",
    ],
  },
  {
    icon: Users,
    titleEn: "User Segmentation & Content Classification",
    titleKo: "사용자 세그먼트 및 콘텐츠 분류",
    itemsEn: [
      "User Types: actual_user (verified owner) / potential_customer / reviewer (professional) / journalist / unknown",
      "Content Types: review (actual evaluation) / general_mention / advertisement (promotional) / noise (irrelevant)",
      "Platform Types: community / review_site / video / blog / news",
      "Region inference: Country code auto-detected from context (US, UK, KR, etc.)",
      "Noise auto-filtered: 'bug' in gaming context, general LG brand mentions without product evaluation, sponsored content tagged separately",
    ],
    itemsKo: [
      "사용자 유형: 실사용자 (구매 확인) / 잠재고객 / 전문 리뷰어 / 기자 / 미분류",
      "콘텐츠 유형: 실제 평가 / 일반 언급 / 광고·홍보 / 노이즈 (비관련)",
      "플랫폼 유형: 커뮤니티 / 리뷰 사이트 / 영상 / 블로그 / 뉴스",
      "지역 추론: 문맥에서 국가 코드 자동 감지 (US, UK, KR 등)",
      "노이즈 자동 필터링: 게임 맥락의 'bug', 제품 평가 없는 LG 일반 언급, 광고성 콘텐츠 별도 태깅",
    ],
  },
  {
    icon: MessageSquare,
    titleEn: "Common Interest Topics & Product Categories (Cross-Region)",
    titleKo: "공통 관심 주제 및 제품 카테고리 (크로스 지역)",
    itemsEn: [
      "📺 TV: OLED (C/G series), QNED/Mini LED, NANO 4K UHD, ART TV (Gallery), StanbyME, webOS/Multi-AI",
      "🎮 Gaming: UltraGear monitors, OLED gaming TVs, cloud gaming, input lag, VRR/G-SYNC/FreeSync",
      "🔊 Audio: Soundbar, XBOOM, Dolby Atmos, eARC compatibility",
      "🏠 Home Appliances: Refrigerator (InstaView, French Door), Washer/Dryer (WashTower, TurboWash), Dishwasher (QuadWash), Microwave",
      "🆕 Air Purifier (PuriCare, Aero Furniture), Oven/Range, Air Conditioner (Artcool, Dual Inverter)",
      "💻 IT: LG Gram laptops, Monitors (UltraWide, UltraFine, Ergo)",
      "🔄 Cross-category: Price/sale comparisons, warranty/AS, wall mounting, calibration, cross-country pricing",
      "🆕 TV Marketing: Nano Detail Enhancer, α7/α8 AI Processor, Linear Flow Design, LG Shield, Re:New Program (5yr upgrade)",
    ],
    itemsKo: [
      "📺 TV: OLED (C/G 시리즈), QNED/Mini LED, NANO 4K UHD, ART TV (Gallery), StanbyME, webOS/Multi-AI",
      "🎮 게이밍: UltraGear 모니터, OLED 게이밍 TV, 클라우드 게이밍, 인풋 랙, VRR/G-SYNC/FreeSync",
      "🔊 오디오: 사운드바, XBOOM, Dolby Atmos, eARC 호환성",
      "🏠 생활가전: 냉장고 (InstaView, French Door), 세탁기/건조기 (WashTower, TurboWash), 식세기 (QuadWash), 전자레인지",
      "🆕 공기청정기 (PuriCare, Aero Furniture), 오븐/레인지, 에어컨 (Artcool, Dual Inverter)",
      "💻 IT: LG 그램 노트북, 모니터 (UltraWide, UltraFine, Ergo)",
      "🔄 크로스 카테고리: 가격/세일 비교, 보증/AS, 벽걸이 설치, 캘리브레이션, 국가별 가격차",
      "🆕 TV 마케팅: Nano Detail Enhancer, α7/α8 AI Processor, Linear Flow Design, LG Shield, Re:New Program (5년 업그레이드)",
    ],
  },
  {
    icon: Languages,
    titleEn: "Language Processing",
    titleKo: "언어 처리",
    itemsEn: [
      "English reviews collected first (English-speaking perspective)",
      "Non-English Reddit activity in English included (Germany, Netherlands, etc.)",
      "All extracted keywords standardized to English regardless of source language",
      "🆕 Multi-language auto-translation: Japanese, Traditional/Simplified Chinese, Thai, Vietnamese, Indonesian, Malay, Hindi → Korean output",
      "🆕 Firecrawl + Gemini AI extraction pipeline for non-English review sources",
      "🆕 Country-of-origin auto-detection from source URL and content language",
    ],
    itemsKo: [
      "영어 리뷰 1차 수집 (영어권 중심 관점)",
      "비영어권 영문 Reddit 활동 포함 (독일, 네덜란드 등)",
      "추출된 모든 키워드는 소스 언어에 관계없이 영문으로 통일",
      "🆕 다국어 자동 번역: 일본어, 번체/간체 중국어, 태국어, 베트남어, 인도네시아어, 말레이어, 힌디어 → 한국어 출력",
      "🆕 Firecrawl + Gemini AI 추출 파이프라인으로 비영어 리뷰 소스 처리",
      "🆕 소스 URL 및 콘텐츠 언어 기반 원산지 국가 자동 감지",
    ],
  },
  {
    icon: ShieldCheck,
    titleEn: "Data Quality & Deduplication",
    titleKo: "데이터 품질 및 중복 제거",
    itemsEn: [
      "Hard dedup: hash(normalized_text) — identical reviews keep 1 copy only",
      "Soft dedup: content similarity ≥ 0.92 + same author/date/model → representative 1 kept",
      "Integrity checks: date ≤ today, URL valid, rating range normalized (1-5 or 0-10)",
      "PII/profanity: flagged in moderation_flags, original masked, never published externally",
      "Bot/spam filtering applied; minimum character count enforced",
      "Brand relevance auto-check: non-LG mentions filtered out with reason",
      "Noise filtering: gaming 'bug', general brand mentions, ads tagged & excluded",
      "Trust signals tracked: verified_purchase, helpful_count/upvotes, editor_tested",
      "Sources verified via WorldPopulationReview, ExpertBeacon, SimilarWeb",
    ],
    itemsKo: [
      "하드 중복: hash(정규화 텍스트) — 동일 리뷰 1건만 유지",
      "소프트 중복: 콘텐츠 유사도 ≥ 0.92 + 동일 작성자/날짜/모델 → 대표 1건만 유지",
      "정합성 체크: 날짜 ≤ 오늘, URL 유효, 평점 범위 정규화 (1-5 또는 0-10)",
      "PII/비속어: moderation_flags에 표시, 원문 마스킹, 외부 공개 금지",
      "봇/스팸 필터링 적용; 최소 문자 수 기준 시행",
      "브랜드 연관성 자동 체크: LG 제품 비관련 언급은 사유와 함께 필터링",
      "노이즈 필터링: 게임 용어 'bug', 일반 브랜드 언급, 광고 태깅 및 제외",
      "신뢰도 시그널 추적: verified_purchase, helpful_count/upvotes, editor_tested",
      "출처: WorldPopulationReview, ExpertBeacon, SimilarWeb 기반 검증",
    ],
  },
  {
    icon: HelpCircle,
    titleEn: "FAQ Generation Pipeline (Conversion-Optimized)",
    titleKo: "FAQ 생성 파이프라인 (전환 최적화)",
    itemsEn: [
      "🎯 Goal: Generate conversion-optimized FAQs from reviews with Evidence, CIS scoring, and legal compliance gate",
      "📥 Input: Reviews (up to 40), official LG product specs (via Firecrawl from lg.com/us), CS ticket patterns",
      "🔍 Q/A Extraction: Identifies question patterns, repeated issues, and conversion barriers (anxiety, info gaps, comparisons, setup concerns) from reviews",
      "📊 Evidence Engine (min 2 per FAQ): quotes[] (30-100 char anonymized excerpts), claims[] (nits/dB/Hz/ms quantitative data), pattern (\"X% of reviews mention [topic]\")",
      "⚡ CIS Formula: 100 × (0.30×freq + 0.20×neg_ratio + 0.20×intent_weight + 0.15×cs_overlap + 0.10×pdp_drop + 0.05×evidence)",
      "🏷️ Priority: P0 (≥80) → P1 (65-79) → P2 (50-64) → Backlog (<50)",
      "🔐 Legal Gate (LGE Checklist): No unsubstantiated superlatives, no competitor comparisons, data source disclosed, genuine UGC only",
      "✅ Publishable Rule: publishable=true ONLY when legal_review=pass AND evidence≥2 items",
      "📋 Weekly Action List: Top 3-5 actions sorted by CIS with ready-to-use PDP highlight & exit popup copy",
      "🗺️ CS Heatmap: Issue × (review frequency, CS frequency, CIS) matrix with action_required flags",
      "📍 PDP Presence: Tracks FAQ implementation status (implemented / missing / outdated ≥90 days)",
      "🧪 A/B Test Suggestions: Position (above-fold vs ATC), count (3 vs 6 FAQs), tone (customer vs official)",
    ],
    itemsKo: [
      "🎯 목표: 리뷰 기반 전환 최적화 FAQ 생성 — Evidence·CIS 점수·법무 검토 게이트 포함",
      "📥 입력: 리뷰 (최대 40건), LG 공식 제품 스펙 (lg.com/us Firecrawl 수집), CS 티켓 패턴",
      "🔍 Q/A 추출: 리뷰에서 질문형 패턴, 반복 이슈, 전환 장애물(불안·정보부족·비교·설치) 식별",
      "📊 Evidence Engine (FAQ당 최소 2개): quotes[] (30-100자 비식별 인용), claims[] (nits/dB/Hz/ms 정량 데이터), pattern (\"리뷰의 X%가 [토픽] 언급\")",
      "⚡ CIS 공식: 100 × (0.30×빈도 + 0.20×부정비율 + 0.20×의도가중치 + 0.15×CS중복 + 0.10×PDP이탈매칭 + 0.05×증거점수)",
      "🏷️ 우선순위: P0 (≥80) → P1 (65-79) → P2 (50-64) → Backlog (<50)",
      "🔐 법무 게이트 (LGE 체크리스트): 근거 없는 최상급 금지, 경쟁사 비교 금지, 데이터 출처 공개, 실제 UGC만 사용",
      "✅ 발행 규칙: publishable=true는 legal_review=pass AND evidence≥2건일 때만",
      "📋 주간 액션리스트: CIS 순 상위 3-5개 액션 + PDP 하이라이트·이탈 팝업 즉시 사용 문구",
      "🗺️ CS 히트맵: 이슈 × (리뷰 빈도, CS 빈도, CIS) 매트릭스 + action_required 플래그",
      "📍 PDP 반영 상태: FAQ 구현 상태 추적 (implemented / missing / outdated ≥90일)",
      "🧪 A/B 테스트 추천: 위치(Above-fold vs ATC 근처), 개수(3문 vs 6문), 문구톤(고객언어 vs 공식톤)",
    ],
  },
  {
    icon: Scale,
    titleEn: "FAQ Legal Compliance (Ad Review Checklist)",
    titleKo: "FAQ 법무 컴플라이언스 (광고 검토 체크리스트)",
    itemsEn: [
      "[General #7] All factual claims substantiated by verifiable review data",
      "[General #9] No unsubstantiated superlatives (best, #1, unprecedented)",
      "[General #28] Data source, collection period, and methodology disclosed",
      "[General #3] Content does not mislead reasonable consumers",
      "[General #4] No unauthorized use of third-party IP, trademarks, or personal data",
      "[General #21] Cited reviews are genuine user-generated content from public sources",
      "[Comparative #31] No direct comparative claims against competitor products",
      "Status: pass → publishable | needs_revision → edit required | fail → blocked",
      "All FAQ items must pass legal gate + have ≥2 evidence items to be marked publishable",
    ],
    itemsKo: [
      "[General #7] 모든 사실적 주장은 검증 가능한 리뷰 데이터로 뒷받침",
      "[General #9] 근거 없는 최상급 표현 사용 금지 (최고, 1위, 전례없는)",
      "[General #28] 데이터 출처, 수집 기간 및 방법론 공개",
      "[General #3] 합리적인 소비자를 오도하는 내용 포함 금지",
      "[General #4] 제3자 IP, 상표, 개인정보 무단 사용 금지",
      "[General #21] 인용된 리뷰는 공개 출처의 실제 사용자 생성 콘텐츠",
      "[Comparative #31] 경쟁사 제품에 대한 직접적인 비교 주장 금지",
      "상태: pass → 발행가능 | needs_revision → 수정 필요 | fail → 차단",
      "모든 FAQ 항목은 법무 검토 통과 + evidence ≥2건이어야 publishable=true",
    ],
  },
  {
    icon: AlertTriangle,
    titleEn: "Review Collection Guide for Risk Minimization",
    titleKo: "리스크 최소화 목적 리뷰 수집가이드",
    itemsEn: [
      "Only public reviews are collected (login-required content is prohibited)",
      "Personal identifiable information (PII) is not stored and immediately removed upon detection",
      "Original review text is never republished externally — only secondary outputs (summaries, scores, keywords) are used",
      "Scraping that violates each platform's ToS (bypass login, mass traffic) is strictly prohibited",
      "This dashboard is for internal strategy use only — external disclosure is prohibited",
    ],
    itemsKo: [
      "공개(public) 리뷰만 수집 (로그인 필요 콘텐츠는 금지)",
      "개인 식별 정보(PII)는 저장하지 않고 즉시 제거",
      "리뷰 원문을 외부 재게시하지 않고, 요약·점수·키워드 등 '2차 가공물'만 사용",
      "각 플랫폼의 ToS를 회피하는 scraping(우회 로그인/대량 트래픽) 금지",
      "대시보드는 내부 전략용으로만 활용 → 외부 공개 금지",
    ],
  },
];

/* ─── 국가 × 채널 상세 수집 현황 테이블 ─── */
interface CollectionRow {
  country: string;
  flag: string;
  lgeCode: string;
  channel: string;
  dataSource: string;
  method: string;
  schedule: string;
  status: "active" | "planned" | "partial";
}

const COLLECTION_DETAIL: CollectionRow[] = [
  // ── 🇺🇸 US ──
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "LG.com (Bazaarvoice)", dataSource: "제품 상세 페이지 고객 리뷰 · 평점 · Pros/Cons 태그", method: "Bazaarvoice API (공식)", schedule: "Sweep 매일 02:00 UTC · Collect 6시간마다 · Sync 매일 06:00 UTC", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "Reddit (r/OLED, r/hometheater 등 15+)", dataSource: "서브레딧 포스트 본문 · 댓글 · 업보트 수", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:00 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "Amazon US", dataSource: "Verified Purchase 리뷰 · 평점 · Helpful 투표 수", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "Best Buy", dataSource: "제품 리뷰 · 평점 · 구매 인증 배지", method: "Public API / 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "YouTube (리뷰 영상 댓글)", dataSource: "리뷰/언박싱 영상 댓글 · 좋아요 수", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "Walmart", dataSource: "제품 리뷰 · 평점 · 구매 인증 리뷰", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "Consumer Reports", dataSource: "전문가 테스트 결과 · 신뢰성 등급 · 추천 점수", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "RTINGS", dataSource: "랩 측정 데이터 · 전문 테스트 점수 · 비교표", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "Costco", dataSource: "회원 제품 리뷰 · 평점", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "ConsumerAffairs", dataSource: "소비자 불만/칭찬 리뷰 · 평점", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "Houzz", dataSource: "홈 인테리어 커뮤니티 제품 리뷰 · 토론", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "US", flag: "🇺🇸", lgeCode: "LGEUS", channel: "BestReviews", dataSource: "에디터 추천 리뷰 · 제품 비교 아티클", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  // ── 🇬🇧 UK ──
  { country: "UK", flag: "🇬🇧", lgeCode: "LGEUK", channel: "LG.com (Bazaarvoice)", dataSource: "제품 상세 페이지 고객 리뷰 · 평점 · Pros/Cons 태그", method: "Bazaarvoice API (공식)", schedule: "Sweep 매일 02:00 UTC · Collect 6시간마다 · Sync 매일 06:00 UTC", status: "active" },
  { country: "UK", flag: "🇬🇧", lgeCode: "LGEUK", channel: "Amazon UK", dataSource: "Verified Purchase 리뷰 · 평점 · Helpful 투표 수", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "UK", flag: "🇬🇧", lgeCode: "LGEUK", channel: "YouTube UK", dataSource: "리뷰/언박싱 영상 댓글 · 좋아요 수", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  { country: "UK", flag: "🇬🇧", lgeCode: "LGEUK", channel: "Trusted Reviews", dataSource: "에디터 심층 리뷰 · 전문 평가 점수", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  // ── 🇩🇪 DE ──
  { country: "DE", flag: "🇩🇪", lgeCode: "LGEDE", channel: "LG.com (Bazaarvoice)", dataSource: "제품 상세 페이지 고객 리뷰 · 평점 · Pros/Cons 태그", method: "Bazaarvoice API (공식)", schedule: "Sweep 매일 02:00 UTC · Collect 6시간마다 · Sync 매일 06:00 UTC", status: "active" },
  { country: "DE", flag: "🇩🇪", lgeCode: "LGEDE", channel: "Amazon DE", dataSource: "Verified Purchase 리뷰 · 평점 (독일어)", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "DE", flag: "🇩🇪", lgeCode: "LGEDE", channel: "YouTube DE", dataSource: "리뷰/언박싱 영상 댓글 (독일어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  // ── 🇦🇺 AU ──
  { country: "AU", flag: "🇦🇺", lgeCode: "LGEAP", channel: "LG.com (Bazaarvoice)", dataSource: "제품 상세 페이지 고객 리뷰 · 평점 · Pros/Cons 태그", method: "Bazaarvoice API (공식)", schedule: "Sweep 매일 02:00 UTC · Collect 6시간마다 · Sync 매일 06:00 UTC", status: "active" },
  { country: "AU", flag: "🇦🇺", lgeCode: "LGEAP", channel: "YouTube AU", dataSource: "리뷰/언박싱 영상 댓글 · 좋아요 수", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  // ── 🇮🇳 IN ──
  { country: "IN", flag: "🇮🇳", lgeCode: "LGEIL", channel: "LG.com (Bazaarvoice)", dataSource: "제품 상세 페이지 고객 리뷰 · 평점 · Pros/Cons 태그", method: "Bazaarvoice API (공식)", schedule: "Sweep 매일 02:00 UTC · Collect 6시간마다 · Sync 매일 06:00 UTC", status: "active" },
  { country: "IN", flag: "🇮🇳", lgeCode: "LGEIL", channel: "Amazon IN", dataSource: "Verified Purchase 리뷰 · 평점 (힌디어/영어)", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "IN", flag: "🇮🇳", lgeCode: "LGEIL", channel: "YouTube IN", dataSource: "리뷰/언박싱 영상 댓글 (힌디어/영어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  // ── 🇯🇵 JP ──
  { country: "JP", flag: "🇯🇵", lgeCode: "LGEJP", channel: "LG.com (Bazaarvoice)", dataSource: "제품 상세 페이지 고객 리뷰 · 평점 (일본어)", method: "Bazaarvoice API (공식)", schedule: "Sweep 매일 02:00 UTC · Collect 6시간마다 · Sync 매일 06:00 UTC", status: "active" },
  { country: "JP", flag: "🇯🇵", lgeCode: "LGEJP", channel: "Amazon JP", dataSource: "Verified Purchase 리뷰 · 평점 (일본어)", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "JP", flag: "🇯🇵", lgeCode: "LGEJP", channel: "YouTube JP", dataSource: "리뷰/언박싱 영상 댓글 (일본어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  { country: "JP", flag: "🇯🇵", lgeCode: "LGEJP", channel: "Web Review (Kakaku 등)", dataSource: "가격비교 사이트 사용자 리뷰 · 평점 (일본어)", method: "Firecrawl + Gemini AI", schedule: "매일 07:10 KST", status: "active" },
  // ── 🇹🇼 TW ──
  { country: "TW", flag: "🇹🇼", lgeCode: "LGETT", channel: "LG.com (Bazaarvoice)", dataSource: "제품 상세 페이지 고객 리뷰 · 평점 (번체 중국어)", method: "Bazaarvoice API (공식)", schedule: "Sweep 매일 02:00 UTC · Collect 6시간마다 · Sync 매일 06:00 UTC", status: "active" },
  { country: "TW", flag: "🇹🇼", lgeCode: "LGETT", channel: "YouTube TW", dataSource: "리뷰/언박싱 영상 댓글 (번체 중국어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  { country: "TW", flag: "🇹🇼", lgeCode: "LGETT", channel: "Web Review (PTT 등)", dataSource: "PTT 게시판 제품 토론 · 사용기 (번체 중국어)", method: "Firecrawl + Gemini AI", schedule: "매일 07:10 KST", status: "active" },
  // ── 🇹🇭 TH ──
  { country: "TH", flag: "🇹🇭", lgeCode: "LGETH", channel: "LG.com (Bazaarvoice)", dataSource: "제품 상세 페이지 고객 리뷰 · 평점 (태국어)", method: "Bazaarvoice API (공식)", schedule: "Sweep 매일 02:00 UTC · Collect 6시간마다 · Sync 매일 06:00 UTC", status: "active" },
  { country: "TH", flag: "🇹🇭", lgeCode: "LGETH", channel: "Shopee TH", dataSource: "이커머스 구매자 리뷰 · 평점 · 사진 리뷰 (태국어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "active" },
  { country: "TH", flag: "🇹🇭", lgeCode: "LGETH", channel: "Lazada TH", dataSource: "이커머스 구매자 리뷰 · 평점 (태국어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "active" },
  { country: "TH", flag: "🇹🇭", lgeCode: "LGETH", channel: "YouTube TH", dataSource: "리뷰/언박싱 영상 댓글 (태국어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  // ── 🇸🇬 SG ──
  { country: "SG", flag: "🇸🇬", lgeCode: "LGESL", channel: "Shopee SG", dataSource: "이커머스 구매자 리뷰 · 평점 · 사진 리뷰", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "active" },
  { country: "SG", flag: "🇸🇬", lgeCode: "LGESL", channel: "Lazada SG", dataSource: "이커머스 구매자 리뷰 · 평점", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "active" },
  { country: "SG", flag: "🇸🇬", lgeCode: "LGESL", channel: "YouTube SG", dataSource: "리뷰/언박싱 영상 댓글 · 좋아요 수", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  { country: "SG", flag: "🇸🇬", lgeCode: "LGESL", channel: "Amazon SG", dataSource: "Verified Purchase 리뷰 · 평점", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  // ── 🇻🇳 VN ──
  { country: "VN", flag: "🇻🇳", lgeCode: "LGEVN", channel: "Shopee VN", dataSource: "이커머스 구매자 리뷰 · 평점 (베트남어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "active" },
  { country: "VN", flag: "🇻🇳", lgeCode: "LGEVN", channel: "Lazada VN", dataSource: "이커머스 구매자 리뷰 · 평점 (베트남어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "active" },
  { country: "VN", flag: "🇻🇳", lgeCode: "LGEVN", channel: "YouTube VN", dataSource: "리뷰/언박싱 영상 댓글 (베트남어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  // ── 🇮🇩 ID ──
  { country: "ID", flag: "🇮🇩", lgeCode: "LGEIN", channel: "Shopee ID", dataSource: "이커머스 구매자 리뷰 · 평점 (인도네시아어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "active" },
  { country: "ID", flag: "🇮🇩", lgeCode: "LGEIN", channel: "Lazada ID", dataSource: "이커머스 구매자 리뷰 · 평점 (인도네시아어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "active" },
  { country: "ID", flag: "🇮🇩", lgeCode: "LGEIN", channel: "YouTube ID", dataSource: "리뷰/언박싱 영상 댓글 (인도네시아어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  // ── 🇭🇰 HK ──
  { country: "HK", flag: "🇭🇰", lgeCode: "LGEHK", channel: "Reviews.io", dataSource: "소비자 리뷰 · 평점 (광둥어/영어)", method: "Firecrawl 스크래핑", schedule: "매일 07:10 KST", status: "active" },
  { country: "HK", flag: "🇭🇰", lgeCode: "LGEHK", channel: "YouTube HK", dataSource: "리뷰/언박싱 영상 댓글 (광둥어/영어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  // ── 🇵🇭 PH ──
  { country: "PH", flag: "🇵🇭", lgeCode: "LGEPH", channel: "Shopee PH", dataSource: "이커머스 구매자 리뷰 · 평점 (필리핀어/영어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "planned" },
  { country: "PH", flag: "🇵🇭", lgeCode: "LGEPH", channel: "Lazada PH", dataSource: "이커머스 구매자 리뷰 · 평점 (필리핀어/영어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "planned" },
  // ── 🇲🇾 MY ──
  { country: "MY", flag: "🇲🇾", lgeCode: "LGEML", channel: "Shopee MY", dataSource: "이커머스 구매자 리뷰 · 평점 (말레이어/영어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "planned" },
  { country: "MY", flag: "🇲🇾", lgeCode: "LGEML", channel: "Lazada MY", dataSource: "이커머스 구매자 리뷰 · 평점 (말레이어/영어)", method: "Firecrawl + Gemini AI 추출", schedule: "매일 07:10 KST", status: "planned" },
  { country: "MY", flag: "🇲🇾", lgeCode: "LGEML", channel: "YouTube MY", dataSource: "리뷰/언박싱 영상 댓글 (말레이어/영어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  // ── 🇧🇷 BR ──
  { country: "BR", flag: "🇧🇷", lgeCode: "LGESP", channel: "LG.com (Bazaarvoice)", dataSource: "제품 상세 페이지 고객 리뷰 · 평점 · Pros/Cons 태그 (포르투갈어)", method: "Bazaarvoice API (공식)", schedule: "Sweep 매일 02:00 UTC · Collect 6시간마다 · Sync 매일 06:00 UTC", status: "active" },
  { country: "BR", flag: "🇧🇷", lgeCode: "LGESP", channel: "YouTube BR", dataSource: "리뷰/언박싱 영상 댓글 (포르투갈어)", method: "YouTube Data API v3", schedule: "매일 07:05 KST", status: "active" },
  { country: "BR", flag: "🇧🇷", lgeCode: "LGESP", channel: "Web Review (Reclame Aqui 등)", dataSource: "소비자 불만/칭찬 리뷰 · CS 평가 (포르투갈어)", method: "Firecrawl + Gemini AI", schedule: "매일 07:10 KST", status: "planned" },
  // ── 🌐 Global ──
  { country: "Global", flag: "🌐", lgeCode: "Global", channel: "Trustpilot", dataSource: "소비자 직접 리뷰 · 평점 · 서비스 평가", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "Global", flag: "🌐", lgeCode: "Global", channel: "CNET", dataSource: "에디터 리뷰 · Editor's Choice 평가 · 비교 아티클", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "Global", flag: "🌐", lgeCode: "Global", channel: "TechRadar", dataSource: "에디터 리뷰 · 전문 평가 점수 · 비교 아티클", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "Global", flag: "🌐", lgeCode: "Global", channel: "PCMag", dataSource: "전문 리뷰 · 벤치마크 점수 · Editor's Choice", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "Global", flag: "🌐", lgeCode: "Global", channel: "Notebookcheck", dataSource: "노트북/모니터 심층 테스트 · 성능 데이터", method: "Firecrawl 스크래핑", schedule: "매일 07:00 KST", status: "active" },
  { country: "Global", flag: "🌐", lgeCode: "Global", channel: "Lemon8", dataSource: "소셜 플랫폼 제품 후기 · 라이프스타일 콘텐츠", method: "Firecrawl 스크래핑", schedule: "매일 07:10 KST", status: "active" },
  { country: "Global", flag: "🌐", lgeCode: "Global", channel: "ComplaintsBoard", dataSource: "소비자 불만 게시글 · CS 이슈 (중동 포함)", method: "Firecrawl 스크래핑", schedule: "매일 07:10 KST", status: "active" },
];

// Map channel names in the detail table → collection_logs source keys or BV locale
const CHANNEL_SOURCE_MAP: Record<string, string> = {
  "LG.com (Bazaarvoice)": "lge_reviews",
  "LG.com (BV) US": "lge_reviews",
  "LG.com (BV) UK": "bazaarvoice_uk",
  "Reddit": "reddit_collector_v2",
  "YouTube US": "youtube_comments",
  "YouTube UK": "youtube_comments",
  "YouTube Global": "youtube_comments",
  "YouTube IN": "youtube_comments",
  "YouTube AU": "youtube_comments",
  "YouTube TH": "youtube_comments",
  "YouTube JP": "youtube_comments",
  "YouTube SG": "youtube_comments",
  "YouTube MY": "youtube_comments",
  "YouTube ID": "youtube_comments",
  "YouTube HK": "youtube_comments",
  "Amazon US": "firecrawl-all",
  "Amazon UK": "firecrawl-all",
  "Amazon DE": "firecrawl-all",
  "Amazon JP": "firecrawl-all",
  "Amazon IN": "firecrawl-all",
  "Shopee SG": "asian_reviews",
  "Shopee TH": "asian_reviews",
  "Shopee MY": "asian_reviews",
  "Shopee PH": "asian_reviews",
  "Shopee ID": "asian_reviews",
  "Lazada SG": "asian_reviews",
  "Lazada TH": "asian_reviews",
  "Lazada MY": "asian_reviews",
  "Lazada PH": "asian_reviews",
  "Lazada ID": "asian_reviews",
};

// Hook: latest collection log per source + BV runs
function useCollectionLogs() {
  const [logs, setLogs] = useState<Record<string, { lastAt: string; count: number; status: string; latestReviewAt?: string }>>({});
  useEffect(() => {
    const fetchLogs = async () => {
      const map: Record<string, { lastAt: string; count: number; status: string; latestReviewAt?: string }> = {};
      // collection_logs: latest per source
      const { data: clData } = await supabase
        .from("collection_logs")
        .select("source, started_at, completed_at, items_collected, status")
        .order("started_at", { ascending: false })
        .limit(500);
      if (clData) {
        const seen = new Set<string>();
        for (const row of clData) {
          if (!seen.has(row.source)) {
            seen.add(row.source);
            map[row.source] = {
              lastAt: row.completed_at || row.started_at,
              count: row.items_collected || 0,
              status: row.status,
            };
          }
        }
      }
      // bv_collection_runs: latest per locale → map to source
      const { data: bvData } = await supabase
        .from("bv_collection_runs")
        .select("locale, started_at, completed_at, reviews_inserted, status")
        .order("started_at", { ascending: false })
        .limit(100);
      if (bvData) {
        const localeToSource: Record<string, string> = {
          en_US: "bv_us", en_GB: "bv_uk", en_IN: "bv_in", zh_TW: "bv_tw",
          ja_JP: "bv_jp", th_TH: "bv_th", de_DE: "bv_de", en_AU: "bv_au",
          pt_BR: "bv_br",
        };
        const seen = new Set<string>();
        for (const row of bvData) {
          const key = localeToSource[row.locale] || `bv_${row.locale}`;
          if (!seen.has(key)) {
            seen.add(key);
            map[key] = {
              lastAt: row.completed_at || row.started_at,
              count: row.reviews_inserted || 0,
              status: row.status || "unknown",
            };
          }
        }
      }

      // Fetch latest collected_at & published_at per lge_com source for BV rows
      const bvSources = ["lge_com_us","lge_com_uk","lge_com_in","lge_com_tw","lge_com_jp","lge_com_th","lge_com_de","lge_com_au","lge_com_br"];
      const bvSourceToBvKey: Record<string, string> = {
        lge_com_us: "bv_us", lge_com_uk: "bv_uk", lge_com_in: "bv_in", lge_com_tw: "bv_tw",
        lge_com_jp: "bv_jp", lge_com_th: "bv_th", lge_com_de: "bv_de", lge_com_au: "bv_au",
        lge_com_br: "bv_br",
      };
      // Get latest review per BV source (by collected_at = actual sync time)
      const latestPromises = bvSources.map(src =>
        supabase
          .from("reviews")
          .select("source, collected_at, published_at")
          .eq("source", src)
          .order("collected_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      );
      const latestResults = await Promise.all(latestPromises);
      for (const res of latestResults) {
        if (res.data?.source) {
          const bvKey = bvSourceToBvKey[res.data.source];
          if (bvKey) {
            // Use actual collected_at as lastAt (most recent sync time)
            if (res.data.collected_at) {
              if (!map[bvKey]) {
                map[bvKey] = { lastAt: res.data.collected_at, count: 0, status: "done" };
              } else {
                map[bvKey].lastAt = res.data.collected_at;
                map[bvKey].status = "done";
              }
            }
            if (res.data.published_at) {
              if (map[bvKey]) map[bvKey].latestReviewAt = res.data.published_at;
            }
          }
        }
      }

      setLogs(map);
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, []);
  return logs;
}

// Hook: recent review counts per source within last N hours (based on reviews.collected_at)
// Reuses the same source keys as useCumulativeSourceCounts so resolveCumulativeCount works.
function useRecentSourceCounts(hours: number) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.rpc("get_recent_source_counts" as any, { p_hours: hours });
      if (error || !data) { setCounts({}); return; }
      const map: Record<string, number> = {};
      (data as { source: string; count: number }[]).forEach(d => {
        const src = d.source;
        const n = Number(d.count || 0);
        map[src] = (map[src] || 0) + n;
        // Also bucket BV per-country sources under the normalized "lge_com_xx" key
        // (resolveCumulativeCount expects this key).
        if (src.startsWith("lge_com_")) {
          // Already in correct shape
        }
      });
      setCounts(map);
    };
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [hours]);
  return counts;
}

// Hook: cumulative review counts per source from DB (includes per-country BV counts)
function useCumulativeSourceCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchData = async () => {
      const [sourceRes, lgcomRes] = await Promise.all([
        supabase.rpc("get_source_counts"),
        supabase.rpc("get_lgcom_country_counts"),
      ]);
      const map: Record<string, number> = {};
      if (sourceRes.data) {
        (sourceRes.data as { source: string; count: number }[]).forEach(d => {
          map[d.source] = Number(d.count || 0);
        });
      }
      // Add per-country lge_com_xx counts so BV rows resolve correctly
      if (lgcomRes.data) {
        (lgcomRes.data as { country: string; count: number }[]).forEach(d => {
          const key = `lge_com_${d.country.toLowerCase()}`;
          map[key] = Number(d.count || 0);
        });
      }
      setCounts(map);
    };
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);
  return counts;
}

// Map channel+country → review source keys for cumulative count
function resolveCumulativeCount(
  channel: string,
  country: string,
  sourceCounts: Record<string, number>
): number {
  // BV channels → lge_com_xx
  if (channel.includes("BV") || channel.includes("Bazaarvoice")) {
    const countryToSource: Record<string, string> = {
      US: "lge_com_us", UK: "lge_com_uk", IN: "lge_com_in", TW: "lge_com_tw",
      JP: "lge_com_jp", TH: "lge_com_th", DE: "lge_com_de", AU: "lge_com_au",
      BR: "lge_com_br",
    };
    return sourceCounts[countryToSource[country] || ""] || 0;
  }
  // Reddit channels
  if (channel.startsWith("Reddit")) {
    // Sum all reddit sources
    if (channel.includes("r/OLED") || channel.includes("r/hometheater") || channel.includes("15+")) {
      return Object.entries(sourceCounts)
        .filter(([k]) => k.startsWith("reddit"))
        .reduce((s, [, v]) => s + v, 0);
    }
    if (channel.includes("r/Appliances")) {
      return (sourceCounts["reddit_appliances"] || 0) + (sourceCounts["reddit_appliancerepair"] || 0);
    }
    if (channel.includes("r/LGgram")) return sourceCounts["reddit_lggram"] || 0;
    if (channel.includes("r/LG_UserHub")) return sourceCounts["reddit_lg_userhub"] || 0;
    if (channel.includes("r/StanbyME")) return sourceCounts["reddit_stanbyme"] || 0;
    if (channel.includes("r/Appliances") || channel.includes("r/HVAC")) {
      return (sourceCounts["reddit_airconditioners"] || 0) + (sourceCounts["reddit_ac"] || 0);
    }
    return Object.entries(sourceCounts)
      .filter(([k]) => k.startsWith("reddit"))
      .reduce((s, [, v]) => s + v, 0);
  }
  // YouTube
  if (channel.startsWith("YouTube")) {
    if (channel.includes("(리뷰 영상 댓글)")) {
      return Object.entries(sourceCounts)
        .filter(([k]) => k.startsWith("youtube"))
        .reduce((s, [, v]) => s + v, 0);
    }
    const cMap: Record<string, string[]> = {
      US: ["youtube", "youtube_LGUSAChannel"],
      UK: ["youtube"],
      DE: ["youtube"],
      AU: ["youtube"],
      IN: ["youtube"],
      JP: ["youtube"],
      TW: ["youtube"],
      TH: ["youtube"],
      SG: ["youtube"],
      VN: ["youtube"],
      ID: ["youtube_id"],
      HK: ["youtube"],
      MY: ["youtube_my"],
    };
    const keys = cMap[country] || ["youtube"];
    return keys.reduce((s, k) => s + (sourceCounts[k] || 0), 0);
  }
  // Amazon
  if (channel.includes("Amazon")) return sourceCounts["amazon"] || 0;
  // Individual channels
  const directMap: Record<string, string> = {
    "Best Buy": "bestbuy",
    "Walmart": "walmart",
    "Consumer Reports": "consumer_reports",
    "RTINGS": "rtings",
    "Costco": "costco",
    "ConsumerAffairs": "consumeraffairs",
    "Houzz": "houzz",
    "BestReviews": "bestreviews",
    "Trustpilot": "trustpilot",
    "CNET": "cnet",
    "TechRadar": "techradar",
    "PCMag": "pcmag",
    "Notebookcheck": "notebookcheck",
    "Trusted Reviews": "trusted_reviews",
    "Lemon8": "lemon8",
  };
  for (const [key, src] of Object.entries(directMap)) {
    if (channel.includes(key)) return sourceCounts[src] || 0;
  }
  // Shopee/Lazada → web_review_xx
  if (channel.includes("Shopee") || channel.includes("Lazada")) {
    const cMap: Record<string, string> = {
      TH: "web_review_th", SG: "web_review_sg", VN: "web_review_vn",
      ID: "web_review_id", MY: "web_review", PH: "web_review",
    };
    return sourceCounts[cMap[country] || "web_review"] || 0;
  }
  // Web Review
  if (channel.includes("Web Review")) {
    const cMap: Record<string, string> = {
      JP: "web_review_jp", TH: "web_review_th", IN: "web_review_in",
      SG: "web_review_sg", VN: "web_review_vn", ID: "web_review_id",
      HK: "web_review_hk", TW: "web_review_tw",
    };
    return sourceCounts[cMap[country] || "web_review"] || 0;
  }
  // Reviews.io
  if (channel.includes("Reviews.io")) return sourceCounts["web_review_hk"] || 0;
  return 0;
}

// Resolve channel → log entry
function resolveChannelLog(
  channel: string,
  country: string,
  logs: Record<string, { lastAt: string; count: number; status: string; latestReviewAt?: string }>
): { lastAt: string; count: number; status: string; latestReviewAt?: string } | null {
  // BV channels first
  if (channel.includes("BV") || channel.includes("Bazaarvoice")) {
    const countryToBv: Record<string, string> = {
      US: "bv_us", UK: "bv_uk", IN: "bv_in", TW: "bv_tw",
      JP: "bv_jp", TH: "bv_th", DE: "bv_de", AU: "bv_au",
      BR: "bv_br",
    };
    const key = countryToBv[country];
    if (key && logs[key]) return logs[key];
  }
  // Direct map
  const fullKey = `${channel} ${country}`;
  if (CHANNEL_SOURCE_MAP[fullKey] && logs[CHANNEL_SOURCE_MAP[fullKey]]) {
    return logs[CHANNEL_SOURCE_MAP[fullKey]];
  }
  if (CHANNEL_SOURCE_MAP[channel] && logs[CHANNEL_SOURCE_MAP[channel]]) {
    return logs[CHANNEL_SOURCE_MAP[channel]];
  }
  // YouTube match
  if (channel.startsWith("YouTube") && logs["youtube_comments"]) return logs["youtube_comments"];
  // Reddit match
  if (channel.startsWith("Reddit") && logs["reddit_collector_v2"]) return logs["reddit_collector_v2"];
  // Firecrawl sources
  if (logs["firecrawl-all"] && (
    channel.includes("Amazon") || channel.includes("RTINGS") || channel.includes("CNET") ||
    channel.includes("TechRadar") || channel.includes("PCMag") || channel.includes("Trustpilot") ||
    channel.includes("Notebookcheck") || channel.includes("Consumer") || channel.includes("Best Buy") ||
    channel.includes("Walmart") || channel.includes("Target") || channel.includes("Reviews.io") ||
    channel.includes("ComplaintsBoard")
  )) return logs["firecrawl-all"];
  // Asian
  if (logs["asian_reviews"] && (channel.includes("Shopee") || channel.includes("Lazada"))) return logs["asian_reviews"];
  return null;
}

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  return `${days}일 전`;
}

const COUNTRY_KO_NAME: Record<string, string> = {
  US: "미국", UK: "영국", DE: "독일", AU: "호주", IN: "인도",
  JP: "일본", TW: "대만", TH: "태국", SG: "싱가포르", VN: "베트남",
  ID: "인도네시아", HK: "홍콩", PH: "필리핀", MY: "말레이시아",
  CA: "캐나다", BR: "브라질", MX: "멕시코", FR: "프랑스",
  Global: "글로벌", Other: "기타",
};

function CollectionDetailTable({ t, dbCountryCounts }: { t: (en: string, ko: string) => string; dbCountryCounts: Record<string, number> }) {
  const [expanded, setExpanded] = useState(true);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [recentWindow, setRecentWindow] = useState<24 | 168>(24); // hours: 24h or 7d
  const collectionLogs = useCollectionLogs();
  const sourceCounts = useCumulativeSourceCounts();
  const recentCounts = useRecentSourceCounts(recentWindow);

  // ✅ Real DB-backed totals (single source of truth)
  // Only count countries that actually have data in the DB.
  const dbActiveCountries = Object.keys(dbCountryCounts).filter(
    (c) => c !== "Other" && (dbCountryCounts[c] || 0) > 0,
  );
  const dbTotalReviews = Object.entries(dbCountryCounts)
    .filter(([k]) => k !== "Other")
    .reduce((s, [, v]) => s + v, 0);

  const countries = [...new Set(COLLECTION_DETAIL.map(r => r.country))];
  const filtered = filterCountry === "all" ? COLLECTION_DETAIL : COLLECTION_DETAIL.filter(r => r.country === filterCountry);

  // Group by country for display
  const grouped = filtered.reduce<Record<string, CollectionRow[]>>((acc, row) => {
    if (!acc[row.country]) acc[row.country] = [];
    acc[row.country].push(row);
    return acc;
  }, {});

  // Calculate cumulative count per country
  const countryTotalCumulative = (country: string, rows: CollectionRow[]): number => {
    const seen = new Set<string>();
    let total = 0;
    for (const row of rows) {
      const key = `${row.channel}|${row.country}`;
      if (seen.has(key)) continue;
      seen.add(key);
      total += resolveCumulativeCount(row.channel, row.country, sourceCounts);
    }
    return total;
  };

  const statusBadge = (s: CollectionRow["status"]) => {
    const cls = s === "active"
      ? "bg-success/15 text-success border-success/20"
      : s === "partial"
        ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/20"
        : "bg-muted text-muted-foreground border-border";
    const label = s === "active" ? "✅ 수집 중" : s === "partial" ? "⚠️ 일부" : "📋 예정";
    return <span className={`inline-flex items-center whitespace-nowrap text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${cls}`}>{label}</span>;
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-primary/20 hover:bg-primary/15 transition-colors"
      >
        <Database className="h-4 w-4 text-primary" />
        <span className="font-bold text-sm flex-1 text-left">
          {t("Country × Channel Detail Table", "국가 × 채널 상세 수집 현황표")}
        </span>
        <span className="text-[10px] text-muted-foreground mr-2">
          {COLLECTION_DETAIL.length}{t(" channels · ", "개 채널 · ")}{dbActiveCountries.length}{t(" countries with data", "개국 (데이터 보유)")}
        </span>
        <span className={`transition-transform text-xs ${expanded ? "rotate-180" : ""}`}>▾</span>
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Country filter pills */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterCountry("all")}
              className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                filterCountry === "all" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("All", "전체")}
            </button>
            {countries.map(c => {
              const row = COLLECTION_DETAIL.find(r => r.country === c)!;
              return (
                <button
                  key={c}
                  onClick={() => setFilterCountry(c)}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                    filterCountry === c ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {row.flag} {COUNTRY_KO_NAME[c] || c}
                </button>
              );
            })}
          </div>

          {/* Summary line — DB-backed (실측치) */}
          {(() => {
            const filteredRows = filterCountry === "all" ? COLLECTION_DETAIL : COLLECTION_DETAIL.filter(r => r.country === filterCountry);
            // Use DB country counts as the single source of truth for review totals.
            const filteredCumulative = filterCountry === "all"
              ? dbTotalReviews
              : (dbCountryCounts[filterCountry] || 0);
            const filteredCountriesCount = filterCountry === "all"
              ? dbActiveCountries.length
              : ((dbCountryCounts[filterCountry] || 0) > 0 ? 1 : 0);
            return (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40 text-[11px] font-medium text-foreground">
                <span>📊</span>
                <span>
                  {filterCountry === "all" ? t("Total", "총") : `${COUNTRY_KO_NAME[filterCountry] || filterCountry}`} <span className="font-bold text-primary">{filteredCountriesCount}</span>{t(" countries", "개국")} · <span className="font-bold text-primary">{filteredRows.length}</span>{t(" channels", "개 채널")} · {t("Cumulative", "누적")} <span className="font-bold text-primary">{filteredCumulative.toLocaleString()}</span>{t(" reviews collected", "건 수집")}
                </span>
              </div>
            );
          })()}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-2 py-1.5 font-bold text-muted-foreground">{t("Country", "국가")}</th>
                  
                  <th className="text-left px-2 py-1.5 font-bold text-muted-foreground">{t("Channel", "채널")}</th>
                  <th className="text-left px-2 py-1.5 font-bold text-muted-foreground">{t("Collected Data", "수집 대상 데이터")}</th>
                  <th className="text-left px-2 py-1.5 font-bold text-muted-foreground">{t("Collection Method", "수집 방식")}</th>
                  <th className="text-left px-2 py-1.5 font-bold text-muted-foreground">{t("Schedule", "수집 주기")}</th>
                  <th className="text-left px-2 py-1.5 font-bold text-muted-foreground">{t("Latest Review / Last Run", "최신 리뷰일 / 수집일")}</th>
                  <th className="text-right px-2 py-1.5 font-bold text-muted-foreground whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <span title={t("New reviews collected within the selected window (based on reviews.collected_at)", "선택한 기간 내 새로 수집된 리뷰 수 (reviews.collected_at 기준)")}>
                        {recentWindow === 24 ? t("Last 24h", "최근 24h") : t("Last 7d", "최근 7d")}
                      </span>
                      <div className="inline-flex rounded border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setRecentWindow(24)}
                          className={`px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${recentWindow === 24 ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                        >24h</button>
                        <button
                          type="button"
                          onClick={() => setRecentWindow(168)}
                          className={`px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${recentWindow === 168 ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                        >7d</button>
                      </div>
                    </div>
                  </th>
                  <th className="text-right px-2 py-1.5 font-bold text-muted-foreground">{t("Cumulative", "누적 건수")}</th>
                  <th className="text-center px-2 py-1.5 font-bold text-muted-foreground">{t("Status", "상태")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([country, rows]) =>
                  rows.map((row, ri) => {
                    const logEntry = resolveChannelLog(row.channel, row.country, collectionLogs);
                    const cumulative = resolveCumulativeCount(row.channel, row.country, sourceCounts);
                    const recent = resolveCumulativeCount(row.channel, row.country, recentCounts);
                    return (
                    <tr
                      key={`${country}-${ri}`}
                      className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                        ri === 0 ? "border-t border-border" : ""
                      }`}
                    >
                      {ri === 0 ? (
                        <td
                          rowSpan={rows.length}
                          className="px-2 py-1.5 font-bold text-foreground align-top border-r border-border/30 cursor-pointer select-none"
                          onClick={() => setExpandedCountry(expandedCountry === country ? null : country)}
                        >
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-sm leading-tight">
                              {row.flag} {COUNTRY_KO_NAME[country] || country}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-normal" style={{ wordBreak: "keep-all" }}>
                              ({country})
                            </span>
                            {expandedCountry === country && (
                              <span className="text-[10px] font-bold text-primary mt-0.5 animate-in fade-in whitespace-nowrap">
                                📊 {rows.length}개 채널, 누적 {countryTotalCumulative(country, rows).toLocaleString()}건 수집
                              </span>
                            )}
                          </div>
                        </td>
                      ) : null}
                      
                      <td className="px-2 py-1.5 font-semibold text-foreground">{row.channel}</td>
                      <td className="px-2 py-1.5 text-muted-foreground/80 italic">{row.dataSource}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{row.method}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{row.schedule}</td>
                      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                        {logEntry ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[10px] ${logEntry.status === "running" ? "text-yellow-600" : "text-foreground font-medium"}`}>
                              {logEntry.status === "running" ? "🔄 " : "✅ "}
                              {formatTimeAgo(logEntry.lastAt)} 동기화
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap" title={t(`New reviews collected in last ${recentWindow === 24 ? "24 hours" : "7 days"} (reviews.collected_at)`, `최근 ${recentWindow === 24 ? "24시간" : "7일"} 신규 수집 (reviews.collected_at 기준)`)}>
                        {recent > 0 ? (
                          <span className="text-foreground font-semibold">+{recent.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">
                        {cumulative > 0 ? (
                          <span className="font-bold text-primary">{cumulative.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">{statusBadge(row.status)}</td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            <span>✅ 수집 중: <span className="font-bold text-foreground">{COLLECTION_DETAIL.filter(r => r.status === "active").length}</span>개</span>
            <span>📋 예정: <span className="font-bold text-foreground">{COLLECTION_DETAIL.filter(r => r.status === "planned").length}</span>개</span>
            <span>📊 누적 총계: <span className="font-bold text-primary">{dbTotalReviews.toLocaleString()}</span>건</span>
            <span className="ml-auto">
              ⏰ BV: Sweep(02:00 UTC) → Collect(6h마다) → Sync(06:00 UTC) |
              📦 기타: Reddit/Amazon 07:00 KST → YouTube 07:05 KST → 아시아 07:10 KST
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export const CollectionCriteria = () => {
  const { t } = useLang();
  const lgComCounts = useLgComCounts();
  const countryCounts = useAllCountryCounts();
  const categoryCounts = useCategoryCounts();
  const [showAllCriteria, setShowAllCriteria] = useState(false);
  const [statusTab, setStatusTab] = useState<"country" | "category" | "channel">("country");

  // Countries with actual data
  const activeCountries = Object.entries(countryCounts)
    .filter(([k]) => k !== "Other" && k !== "Global")
    .sort(([, a], [, b]) => b - a);

  // Split criteria into priority groups
  const priorityCriteria = criteria.filter((c) =>
    ["Collection Schedule & Dashboard Sync", "Target Regions (20+ Countries)", "Selection Logic"].includes(c.titleEn)
  );
  const secondaryCriteria = criteria.filter((c) => !priorityCriteria.includes(c));

  return (
    <div className="space-y-0">
      <div className="gradient-card rounded-t-xl border border-border p-4 md:p-5 flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold font-heading">📋 {t("Data Collection Criteria", "데이터 수집 기준")}</h3>
      </div>
      <div className="gradient-card rounded-b-xl border border-t-0 border-border p-4 md:p-6 space-y-5">

        {/* ─── 수집 현황 종합 (3-tab: 국가 / 카테고리 / 채널) ─── */}
        <section className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
          {/* Summary header */}
          {(() => {
            const totalCountry = Object.values(countryCounts).reduce((s, v) => s + v, 0);
            const bvCollected = Object.entries(BV_AVAILABLE).reduce((s, [code]) => {
              const iso = Object.entries(ISO_TO_LGE).find(([, v]) => v === code)?.[0] || "";
              return s + (lgComCounts[iso] || 0);
            }, 0);
            const bvTotal = Object.values(BV_AVAILABLE).reduce((s, v) => s + v, 0);
            const totalChannels = CATEGORY_CHANNELS.reduce((s, c) => s + c.channels.length, 0);
            return (
              <div className="bg-primary/10 px-4 py-2.5 flex flex-wrap items-center gap-4 border-b border-primary/20">
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  {t("Collection Status Overview", "수집 현황 종합")}
                </h4>
                <div className="flex flex-wrap gap-3 ml-auto text-[11px]">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    📊 {t("Total", "총 리뷰")} <span className="text-primary font-bold">{totalCountry.toLocaleString()}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    🌏 {activeCountries.length + (countryCounts["Global"] ? 1 : 0)} {t("countries", "개국")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    📦 {mergeCategoryCountsByKo(categoryCounts).filter(c => c.category !== "General" && c.category !== "미분류").length} {t("categories", "카테고리")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    📡 {totalChannels} {t("channels", "채널")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    🏪 BV {bvCollected.toLocaleString()}/{bvTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Tab buttons */}
          <div className="flex border-b border-primary/10 px-3 pt-2 gap-1">
            {([
              { key: "country" as const, label: t("By Country", "국가별"), icon: "🌏" },
              { key: "category" as const, label: t("By Category", "카테고리별"), icon: "📦" },
              { key: "channel" as const, label: t("By Collection Channel", "수집채널별"), icon: "📡" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-t-md transition-colors border border-b-0 ${
                  statusTab === tab.key
                    ? "bg-background text-primary border-primary/20"
                    : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="p-3">
            {/* ── 국가별 ── */}
            {statusTab === "country" && (() => {
              // Build per-country data: BV + Community
              const countryData = activeCountries.map(([iso, totalCount]) => {
                const lgeCode = ISO_TO_LGE[iso] || iso;
                const bvCount = lgComCounts[iso] || 0;
                const communityCount = totalCount - bvCount;
                return { iso, lgeCode, totalCount, bvCount, communityCount };
              });
              const globalTotal = Object.values(countryCounts).reduce((s, v) => s + v, 0);
              const maxCount = countryData.length > 0 ? Math.max(...countryData.map(d => d.totalCount)) : 1;

              return (
                <div className="space-y-3">
                  {/* Stacked bar grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {countryData.map(({ iso, lgeCode, totalCount, bvCount, communityCount }) => {
                      return (
                        <div key={iso} className="rounded border border-border bg-background/60 px-2 py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[10px]">{LGE_FLAGS[lgeCode] || "🔹"} {COUNTRY_KO_NAME[iso] || iso}</span>
                            <span className="text-[10px] font-bold text-foreground">{totalCount.toLocaleString()}</span>
                          </div>
                          {/* Stacked bar: BV (primary) + Community (teal) */}
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden my-0.5 flex">
                            {bvCount > 0 && (
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${(bvCount / maxCount) * 100}%` }}
                                title={`BV ${bvCount.toLocaleString()}`}
                              />
                            )}
                            {communityCount > 0 && (
                              <div
                                className="h-full bg-teal-500 transition-all"
                                style={{ width: `${(communityCount / maxCount) * 100}%` }}
                                title={`커뮤니티 ${communityCount.toLocaleString()}`}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                            {bvCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />BV {bvCount.toLocaleString()}
                              </span>
                            )}
                            {communityCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />커뮤니티 {communityCount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {/* Global */}
                    {countryCounts["Global"] && countryCounts["Global"] > 0 && (
                      <div className="rounded border border-border bg-background/60 px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[10px]">🌐 글로벌</span>
                          <span className="text-[10px] font-bold text-foreground">{countryCounts["Global"].toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden my-0.5 flex">
                          <div className="h-full bg-teal-500 transition-all" style={{ width: `${Math.max((countryCounts["Global"] / maxCount) * 100, 4)}%` }} />
                        </div>
                        <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />커뮤니티 {countryCounts["Global"].toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-[9px] text-muted-foreground border-t border-border/50 pt-1.5">
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-primary" /> 바자보이스 (LG.com)</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-teal-500" /> 커뮤니티 (Reddit·Amazon·YouTube 등)</span>
                    <span className="ml-auto font-semibold">누적 총계: <span className="text-primary font-bold">{globalTotal.toLocaleString()}</span>건</span>
                  </div>
                </div>
              );
            })()}

            {/* ── 카테고리별 (영/한 표기를 한글 라벨 기준으로 합산) ── */}
            {statusTab === "category" && categoryCounts.length > 0 && (() => {
              const merged = mergeCategoryCountsByKo(categoryCounts);
              const grandTotal = merged.reduce((s, c) => s + c.count, 0);
              const filtered = merged.filter(c => c.category !== "General" && c.category !== "미분류");
              const classifiedTotal = filtered.reduce((s, c) => s + c.count, 0);
              const generalCount = merged.find(c => c.category === "General" || c.category === "미분류")?.count || 0;
              const maxCount = filtered.length > 0 ? filtered[0].count : 1;

              return (
                <div className="space-y-3">
                  {/* Card grid - 4 per row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {filtered.map((c) => {
                      const pct = classifiedTotal > 0 ? Math.round((c.count / classifiedTotal) * 100) : 0;
                      const barW = Math.max((c.count / maxCount) * 100, 4);
                      return (
                        <div key={c.category} className="rounded border border-border bg-background/60 px-2 py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[10px]">
                              {CATEGORY_ICONS[c.category] || "📦"} {CATEGORY_KO[c.category] || c.category}
                            </span>
                            <span className="text-[9px] text-muted-foreground">{pct}%</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-muted overflow-hidden my-0.5">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${barW}%` }} />
                          </div>
                          <p className="text-[9px] text-muted-foreground">
                            <span className="font-bold text-foreground">{c.count.toLocaleString()}</span> / {classifiedTotal.toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* General (미분류) footer */}
                  {generalCount > 0 && (
                    <div className="rounded border border-border bg-muted/30 px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">📦 미분류 (General)</p>
                        <p className="text-[9px] text-muted-foreground">카테고리 미지정 리뷰 · 분석 제외 · 분모에서 제외</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-muted-foreground">{generalCount.toLocaleString()}</span>
                        <p className="text-[9px] text-muted-foreground">전체 {grandTotal.toLocaleString()} 중 {grandTotal > 0 ? Math.round((generalCount / grandTotal) * 100) : 0}%</p>
                      </div>
                    </div>
                  )}

                  <p className="text-[9px] text-muted-foreground text-right">
                    분류된 리뷰 {classifiedTotal.toLocaleString()}건 기준 · 출처: Bazaarvoice API + 커뮤니티 통합
                  </p>
                </div>
              );
            })()}

            {/* ── 수집채널별 (card grid by category, 4 per row) ── */}
            {statusTab === "channel" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {CATEGORY_CHANNELS.map((cat) => (
                    <div key={cat.labelEn} className="rounded border border-border bg-background/60 px-2.5 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[11px]">
                          {cat.icon} {t(cat.labelEn, cat.labelKo).split("·")[0].trim()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{cat.channels.length}개</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-muted overflow-hidden my-1">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((cat.channels.length / 8) * 100, 100)}%` }} />
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {cat.channels.map((ch) => (
                          <div key={ch.platform} className="flex items-start gap-1" title={ch.countries}>
                            <span className="text-[10px] text-foreground font-medium whitespace-nowrap">{ch.platform}</span>
                            <span className="text-[9px] text-muted-foreground/70 leading-tight truncate">{t(ch.descEn, ch.descKo)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-right">
                  총 {CATEGORY_CHANNELS.reduce((s, c) => s + c.channels.length, 0)}개 채널 · {CATEGORY_CHANNELS.length}개 카테고리
                </p>
              </div>
            )}
          </div>

          <p className="text-[9px] text-muted-foreground px-3 pb-2">
            {t("Source: Bazaarvoice API (Prod) · 9 countries · All categories · No date limit", "출처: Bazaarvoice API (운영 서버) · 9개국 · 전 카테고리 · 작성시점 제한 없음")}
          </p>
        </section>


        {/* ─── 국가×채널 상세 수집 현황 테이블 (수집 방식 위에 배치) ─── */}
        <section>
          <CollectionDetailTable t={t} dbCountryCounts={countryCounts} />
        </section>

        {/* ─── 3. 수집 방식 (Schedule + Regions + Logic) ─── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">{t("Collection Method & Schedule", "수집 방식 및 주기")}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {priorityCriteria.map((c) => {
              const Icon = c.icon;
              const title = t(c.titleEn, c.titleKo);
              const items = t(c.titleEn, c.titleKo) === c.titleEn ? c.itemsEn : c.itemsKo;
              return (
                <div key={c.titleEn} className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <h5 className="font-semibold text-xs">{title}</h5>
                  </div>
                  <ul className="space-y-1">
                    {items.map((item, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── 4. 나머지 기준 (접기/펼치기) ─── */}
        <section>
          <button
            onClick={() => setShowAllCriteria(!showAllCriteria)}
            className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline mb-2"
          >
            <span className={`transition-transform ${showAllCriteria ? "rotate-180" : ""}`}>▾</span>
            {t(
              `${showAllCriteria ? "Hide" : "Show"} detailed criteria (${secondaryCriteria.length} sections)`,
              `상세 기준 ${showAllCriteria ? "접기" : "펼치기"} (${secondaryCriteria.length}개 섹션)`
            )}
          </button>
          {showAllCriteria && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {secondaryCriteria.map((c) => {
                const Icon = c.icon;
                const title = t(c.titleEn, c.titleKo);
                const items = t(c.titleEn, c.titleKo) === c.titleEn ? c.itemsEn : c.itemsKo;
                return (
                  <div key={c.titleEn} className="rounded-lg border border-border bg-background/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <h5 className="font-semibold text-xs">{title}</h5>
                    </div>
                    <ul className="space-y-1">
                      {items.map((item, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
