import { Database, Globe, Calendar, Filter, MessageSquare, ShieldCheck, Languages, ChevronDown, TrendingUp, MapPin, AlertTriangle, Brain, Users, Zap, Search, HelpCircle, Scale, FlaskConical } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

// Live collection counts hook
function useLgComCounts() {
  const [counts, setCounts] = useState<{ us: number; uk: number; us2025: number; uk2025: number }>({ us: 0, uk: 0, us2025: 0, uk2025: 0 });
  useEffect(() => {
    Promise.all([
      supabase.rpc("get_lgcom_country_counts"),
      supabase.from("reviews").select("source", { count: "exact", head: true }).like("source", "lge_com_us").gte("published_at", "2025-01-01"),
      supabase.from("reviews").select("source", { count: "exact", head: true }).like("source", "lge_com_uk").gte("published_at", "2025-01-01"),
    ]).then(([countRes, us2025Res, uk2025Res]) => {
      const data = countRes.data || [];
      const us = Number(data.find((d: any) => d.country === "US")?.count || 0);
      const uk = Number(data.find((d: any) => d.country === "UK")?.count || 0);
      setCounts({
        us, uk,
        us2025: us2025Res.count || 0,
        uk2025: uk2025Res.count || 0,
      });
    });
  }, []);
  return counts;
}

// Estimated total reviews since Jan 2025 (from BV API offset analysis)
const BV_2025_US = 10800;
const BV_2025_UK = 5700;
const BV_TOTAL_US = 435995;
const BV_TOTAL_UK = 48093;

const criteria: CriteriaItem[] = [
  {
    icon: Globe,
    titleEn: "Collection Channels",
    titleKo: "수집 채널",
    itemsEn: [
      "LG.com (lg.com/us, lg.com/uk) — Official LG product pages & customer reviews (US & UK: Bazaarvoice Conversations API Production 연동)",
      "Reddit — Major subreddits (r/OLED, r/hometheater, r/ultrawidemasterrace, r/LGgram, r/LG_UserHub, r/Appliances, r/buildapc, etc.)",
      "Amazon — Product reviews with 'Verified Purchase' trust signal (US, UK, CA, DE, IN, FR)",
      "Best Buy — Retailer product reviews and ratings (US)",
      "Costco — Member product reviews (US)",
      "Walmart — Retailer product reviews (US)",
      "Target — Retailer product reviews (US)",
      "YouTube — Official LG channel comments (US, UK, Global, India, AU — Korea excluded) + review/unboxing video comments via Firecrawl",
      "RTINGS — Professional TV/Monitor/Projector reviews with lab measurements and test results",
      "Trusted Reviews — Professional editor reviews for TV/Monitor/Laptop (UK-based)",
      "Consumer Reports — Consumer evaluation and reliability reports (US-based, public areas only)",
      "CNET — Tech media editor reviews and Editor's Choice ratings",
      "TechRadar — Professional tech reviews with detailed benchmarks",
      "Tom's Hardware — Hardware-focused reviews with benchmark data (monitors, laptops)",
      "Notebookcheck — In-depth laptop reviews with detailed performance measurements",
      "Trustpilot — Direct consumer reviews for appliances/services and CS evaluation",
      "BestReviews — Comprehensive appliance/projector recommendation reviews",
      "ConsumerAffairs — Consumer complaint & review platform for home appliances (US-based)",
      "Houzz — Home improvement community with professional/consumer appliance reviews",
      "Google Reviews/Maps — LG store and service center reviews",
      "LG Community — Official LG community forum discussions and user feedback",
      "Lemon8 — Social platform product reviews and lifestyle content",
      "SoundGuys — Audio product specialist reviews and measurements",
      "PCMag — Professional tech product reviews and ratings",
    ],
    itemsKo: [
      "LG.com (lg.com/us, lg.com/uk) — LG 공식 제품 페이지 및 고객 리뷰 (US & UK: Bazaarvoice Conversations API Production 연동)",
      "Reddit — 주요 서브레딧 (r/OLED, r/hometheater, r/ultrawidemasterrace, r/LGgram, r/LG_UserHub, r/Appliances, r/buildapc 등)",
      "Amazon — 'Verified Purchase' 신뢰 시그널 포함 제품 리뷰 (US, UK, CA, DE, IN, FR)",
      "Best Buy — 리테일러 제품 리뷰 및 평점 (US)",
      "Costco — 회원 제품 리뷰 (US)",
      "Walmart — 리테일러 제품 리뷰 (US)",
      "Target — 리테일러 제품 리뷰 (US)",
      "YouTube — LG 공식 채널 댓글 (US, UK, Global, India, AU — 한국 제외) + 리뷰/언박싱 영상 댓글 Firecrawl 수집",
      "RTINGS — TV·모니터·프로젝터 전문 리뷰, 랩 측정 및 테스트 결과",
      "Trusted Reviews — TV·모니터·노트북 전문 에디터 리뷰 (UK 기반)",
      "Consumer Reports — 가전·TV·노트북 소비자 평가 및 신뢰도 리포트 (US 기반, 공개 영역만)",
      "CNET — 테크 미디어 에디터 리뷰 및 Editor's Choice 평가",
      "TechRadar — 전문 테크 리뷰 및 상세 벤치마크",
      "Tom's Hardware — 하드웨어 중심 리뷰 및 벤치마크 데이터 (모니터, 노트북)",
      "Notebookcheck — 노트북 심층 리뷰 및 상세 성능 측정",
      "Trustpilot — 가전·서비스 소비자 직접 리뷰 및 CS 평가",
      "BestReviews — 가전·프로젝터 종합 추천 리뷰",
      "ConsumerAffairs — 가전 중심 소비자 불만·리뷰 플랫폼 (US 기반)",
      "Houzz — 홈 인테리어 커뮤니티 내 전문가/소비자 가전 리뷰",
      "Google Reviews/Maps — LG 스토어 및 서비스센터 리뷰",
      "LG Community — LG 공식 커뮤니티 포럼 토론 및 사용자 피드백",
      "Lemon8 — 소셜 플랫폼 제품 리뷰 및 라이프스타일 콘텐츠",
      "SoundGuys — 오디오 제품 전문 리뷰 및 측정",
      "PCMag — 전문 테크 제품 리뷰 및 평가",
    ],
  },
  {
    icon: Search,
    titleEn: "Expanded Keyword Taxonomy (6 Categories)",
    titleKo: "확장 키워드 분류체계 (6개 카테고리)",
    itemsEn: [
      "1️⃣ Product Name · Model: Official names + abbreviations + shorthand (e.g., LG Gram, Gram16, G16, OLED C4, UltraGear, WashTower, StanbyME)",
      "2️⃣ Feature · Spec: battery, heat, performance, picture quality, brightness, weight, firmware, bug, stuttering, noise, energy efficiency, HDR, refresh rate, burn-in",
      "3️⃣ Sentiment · Attitude: Positive (recommend, satisfied, impressive, must-have) / Negative (disappointed, refund, defective, avoid) / Mixed (expensive but good, great except for)",
      "4️⃣ Comparison · Alternative: better than, switched from, alternative to, Samsung vs LG, upgrade from, do not recommend",
      "5️⃣ Problem · Desire: wish it had, needs improvement, fix this, missing feature, deal breaker, frustrating",
      "All keywords are standardized in English regardless of source language",
    ],
    itemsKo: [
      "1️⃣ 제품명·모델명: 정식 명칭 + 약어 + 줄임말 (예: LG 그램, Gram16, G16, OLED C4, UltraGear, WashTower, StanbyME)",
      "2️⃣ 기능·스펙: 배터리, 발열, 성능, 화질, 밝기, 무게, 펌웨어, 버그, 끊김, 소음, 에너지효율, HDR, 주사율, 번인",
      "3️⃣ 감정·태도: 긍정 (추천, 만족, 인상적, 필수템) / 부정 (실망, 환불, 불량, 비추) / 혼합 (비싸지만 좋다, 좋은데 아쉬운)",
      "4️⃣ 비교·대체: A보다 B가 낫다, A에서 B로 바꿨다, 대체제, 삼성 vs LG, 업그레이드, 추천 안 함",
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
      "D. Competitor Comparison — Samsung vs LG, Sony vs LG, switched from, upgrade from, alternative to",
      "E. Time Filter — Past 24 hours (default, KST) or since last collection timestamp (dedup)",
      "F. Fallback — If model name is ambiguous, use category + core issue keywords as backup query",
    ],
    itemsKo: [
      "A. 의도형 + 정량형 결합: [브랜드/모델] + review|ratings|\"verified purchase\" + [기능/이슈] + [정량 키워드: hours|nits|dB|W|Hz|ms]",
      "B. Pain Point 추적 — TV: burn-in, uniformity, green tint, brightness SDR/HDR | AC: cooling speed, noise dB, Dual Inverter | 모니터: backlight bleed, response time, overshoot, VRR",
      "C. 신뢰도 시그널 — Amazon/BestBuy: 'Verified Purchase' 또는 helpful votes | Reddit: upvotes | RTINGS: 'test results' 또는 lab measurements",
      "D. 경쟁사 비교 — Samsung vs LG, Sony vs LG, switched from, upgrade from, alternative to",
      "E. 기간 필터 — 최근 24시간 (기본, KST) 또는 마지막 수집 시각 이후만 (중복 방지)",
      "F. 폴백 — 모델명이 모호할 때 카테고리 + 핵심 이슈 키워드만으로 백오프 쿼리",
    ],
  },
  {
    icon: Brain,
    titleEn: "AI Analysis Pipeline (6-in-1 + Enhanced Extraction)",
    titleKo: "AI 분석 파이프라인 (6-in-1 + 강화 추출)",
    itemsEn: [
      "1️⃣ Expanded Keyword Detection — Detects product names, features/specs, sentiment, comparison, and problem/desire keywords",
      "2️⃣ Brand Relevance Check — Determines if mention is actually about an LG product (brand_relevant: true/false + reason)",
      "3️⃣ Granular Sentiment — 10 emotion categories × intensity 1-5 with emotion_evidence sentence",
      "4️⃣ Noise Filtering — Classifies content as: review / general_mention / advertisement / noise",
      "5️⃣ User Segmentation — Infers user type, region (country code), and platform type",
      "6️⃣ Marketing Message Conversion — Auto-generates copy: positive → recommendation, negative → improvement, mixed → balanced",
      "🆕 Topic Labeling — Multi-select from 27+ topics (picture_quality, brightness, uniformity, motion, HDR, gaming, noise, cooling_speed, etc.)",
      "🆕 Pain Points — { type, snippet, severity 1-5, evidence_value } extraction per review",
      "🆕 Strengths — { feature, snippet } for positive highlights",
      "🆕 Quantitative Claims — Captures nits, dB, W, Hz, ms, hours, BTU, sq ft values with context",
      "🆕 Competitor Mentions — { brand, model, direction +/-, snippet } for competitive intelligence",
      "🆕 Marketing Quotes — 1-2 copy-ready sentences (30-140 chars) per review",
      "🆕 FAQ Candidates — Repeated issues converted to Q&A format with evidence-based draft answers",
    ],
    itemsKo: [
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
      "🆕 경쟁사 언급 — { brand, model, direction +/-, snippet } 경쟁 인텔리전스",
      "🆕 마케팅 인용 — 리뷰당 1-2개 카피 레디 문장 (30-140자)",
      "🆕 FAQ 후보 — 반복 이슈를 Q&A 형식으로 변환, 근거 기반 답변 초안",
    ],
  },
  {
    icon: MapPin,
    titleEn: "Target Regions (Top 10)",
    titleKo: "대상 지역 (Top 10)",
    itemsEn: [
      "🇺🇸 United States [LGEUS] — Largest Reddit user base & highest lg.com traffic",
      "🇬🇧 United Kingdom [LGEUK] — 2nd largest English-speaking, high Reddit engagement",
      "🇨🇦 Canada [LGECI] — Large English-speaking user base, active tech communities",
      "🇦🇺 Australia [LGEAP] — 4th largest English-speaking, high activity",
      "🇩🇪 Germany [LGEDG] — Non-English but active on English Reddit, top lg.com interest",
      "🇮🇳 India [LGEIN] · 🇫🇷 France [LGEFS] · 🇧🇷 Brazil [LGESP] · 🇳🇱 Netherlands [LGEBN] · 🇲🇽 Mexico [LGEMS]",
    ],
    itemsKo: [
      "🇺🇸 미국 [LGEUS] — Reddit 최대 사용자 & lg.com 최대 트래픽",
      "🇬🇧 영국 [LGEUK] — 영어권 2위, Reddit 참여도 높음",
      "🇨🇦 캐나다 [LGECI] — 영어권 대형 사용자, 테크 커뮤니티 활발",
      "🇦🇺 호주 [LGEAP] — 영어권 4위권, 활동성 높음",
      "🇩🇪 독일 [LGEDG] — 비영어권이지만 영문 Reddit 활발, lg.com 관심 상위",
      "🇮🇳 인도 [LGEIN] · 🇫🇷 프랑스 [LGEFS] · 🇧🇷 브라질 [LGESP] · 🇳🇱 네덜란드 [LGEBN] · 🇲🇽 멕시코 [LGEMS]",
    ],
  },
  {
    icon: TrendingUp,
    titleEn: "Selection Logic",
    titleKo: "선정 로직",
    itemsEn: [
      "Primary metric: Reddit annual users by country (WorldPopulationReview)",
      "Weighting: English-speaking proportion (English-speaking countries ↑, non-English English activity included)",
      "Verification: lg.com traffic distribution for CE interest validation (SimilarWeb)",
    ],
    itemsKo: [
      "1차 지표: Reddit 국가별 연간 사용자 수 (WorldPopulationReview)",
      "가중치: 영어권/영문 사용 비중 (영어권 국가 ↑, 비영어권 영문 활동 포함)",
      "보조 확인: lg.com 트래픽 분포로 CE 관심도 검증 (SimilarWeb)",
    ],
  },
  {
    icon: Calendar,
    titleEn: "Collection Schedule & Dashboard Sync",
    titleKo: "수집 주기 및 대시보드 동기화",
    itemsEn: [
      "⏰ Automated daily collection at 07:00 AM KST (22:00 UTC) via pg_cron scheduled job",
      "📦 collect-reviews runs at 07:00 KST → collect-youtube-comments follows at 07:05 KST",
      "Trending dashboard updates automatically after each collection cycle (same timing)",
      "Weekly aggregation period: Last 7 days rolling window for trend snapshots & keywords",
      "Based on last 12 months data for long-term analysis (rolling update)",
      "Intensive collection around major sales seasons (Black Friday, CES, etc.)",
    ],
    itemsKo: [
      "⏰ 매일 오전 7:00 KST (UTC 22:00)에 pg_cron 스케줄링으로 자동 일괄 수집",
      "📦 collect-reviews 07:00 KST 실행 → collect-youtube-comments 07:05 KST 후속 실행",
      "트렌딩 대시보드는 수집 완료 직후 자동 갱신 (수집 주기 = 대시보드 갱신 주기)",
      "주간 집계 기간: 최근 7일 롤링 윈도우 기준 트렌드 스냅샷 및 키워드 추출",
      "장기 분석을 위한 최근 12개월 데이터 기준 (롤링 업데이트)",
      "주요 세일 시즌(Black Friday, CES 등) 전후 집중 수집",
    ],
  },
  {
    icon: TrendingUp,
    titleEn: "lge.com Inbound Keywords Top 100",
    titleKo: "lge.com 유입 키워드 Top 100 활용",
    itemsEn: [
      "1-10: OLED, LG Gram, UltraGear, ThinQ, AI Core Tech, 4K, HDR, G-Sync Compatible, Thin and Light, Burn-in",
      "11-20: C4, G4, C3, CX, Nano IPS, 144Hz, 1ms, Dolby Vision, LoDB, Smart TV",
      "21-30: Refrigerator, Washing machine, Dryer, French door, Inverter, Core Ultra, LG Glance, Portable, 1440p, FreeSync",
      "31-40: Uniformity, Green tint, Backlight bleed, 17Z90TP, Hybrid AI, Time Travel, Dolby Atmos, Sleek, 21:9, Curved",
      "41-50: GP850, GL850, 27GL83A, Dishwasher, Energy-efficient, Life's Good, NanoCell, QHD, Overclock, DisplayPort",
      "51-60: Deep Wash, Commercial Washer, Drum Machine, LG Partner Store, Consumer Reports, JD Power, CES 2026, B2B, Builder market",
      "61-70: Alpha 9 Processor, Evo panel, Brightness Booster, Magic Remote, WebOS, Game Dashboard, Input lag, VRR, ALLM, HDMI 2.1",
      "71-80: Style edition, Aerominum, Magnesium alloy, Number pad, Trackpad, Arc Graphics, Multi-tasking, Future proof, Anti-glare, Nits",
      "81-90: InstaView, Door-in-Door, Craft Ice, Linear Compressor, Direct Drive Motor, TurboWash, Steam cycle, Heat pump dryer, QuadWash, TrueSteam",
      "91-100: SEO, Organic traffic, PPC bidding, Long-tail keywords, Influencer collaboration, Customer satisfaction, Brand reputation, Social listening",
      "These 100 keywords are included in the automated daily collection to capture real search-driven user interest",
    ],
    itemsKo: [
      "1-10: OLED, LG Gram, UltraGear, ThinQ, AI Core Tech, 4K, HDR, G-Sync Compatible, Thin and Light, Burn-in",
      "11-20: C4, G4, C3, CX, Nano IPS, 144Hz, 1ms, Dolby Vision, LoDB, Smart TV",
      "21-30: Refrigerator, Washing machine, Dryer, French door, Inverter, Core Ultra, LG Glance, Portable, 1440p, FreeSync",
      "31-40: Uniformity, Green tint, Backlight bleed, 17Z90TP, Hybrid AI, Time Travel, Dolby Atmos, Sleek, 21:9, Curved",
      "41-50: GP850, GL850, 27GL83A, Dishwasher, Energy-efficient, Life's Good, NanoCell, QHD, Overclock, DisplayPort",
      "51-60: Deep Wash, Commercial Washer, Drum Machine, LG Partner Store, Consumer Reports, JD Power, CES 2026, B2B, Builder market",
      "61-70: Alpha 9 Processor, Evo panel, Brightness Booster, Magic Remote, WebOS, Game Dashboard, Input lag, VRR, ALLM, HDMI 2.1",
      "71-80: Style edition, Aerominum, Magnesium alloy, Number pad, Trackpad, Arc Graphics, Multi-tasking, Future proof, Anti-glare, Nits",
      "81-90: InstaView, Door-in-Door, Craft Ice, Linear Compressor, Direct Drive Motor, TurboWash, Steam cycle, Heat pump dryer, QuadWash, TrueSteam",
      "91-100: SEO, Organic traffic, PPC bidding, Long-tail keywords, Influencer collaboration, Customer satisfaction, Brand reputation, Social listening",
      "이 100개 키워드는 실제 검색 기반 사용자 관심을 포착하기 위해 매일 자동 수집에 포함됩니다",
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
    titleEn: "Common Interest Topics (Cross-Region)",
    titleKo: "공통 관심 주제 (크로스 지역)",
    itemsEn: [
      "OLED TV (C/G series), QNED/Mini LED, UltraGear gaming monitors",
      "Price/sale comparisons, warranty/service, wall mounting, calibration",
      "Console/PC connectivity (VRR, 4K120Hz, G-SYNC/FreeSync)",
      "Cross-country pricing, import vs official distribution, eARC/soundbar compatibility",
    ],
    itemsKo: [
      "OLED TV (C/G 시리즈), QNED/Mini LED, UltraGear 게이밍 모니터",
      "가격/세일 비교, 보증/AS, 벽걸이 설치, 캘리브레이션",
      "콘솔/PC 연결성 (VRR, 4K120Hz, G-SYNC/FreeSync)",
      "국가별 가격차, 직구 vs 정식 유통, eARC/사운드바 호환",
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
      "Multi-language NLP expansion planned",
    ],
    itemsKo: [
      "영어 리뷰 1차 수집 (영어권 중심 관점)",
      "비영어권 영문 Reddit 활동 포함 (독일, 네덜란드 등)",
      "추출된 모든 키워드는 소스 언어에 관계없이 영문으로 통일",
      "향후 다국어 NLP 확장 예정",
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

export const CollectionCriteria = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLang();
  const counts = useLgComCounts();


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full gradient-card rounded-xl border border-border p-4 md:p-5 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold font-heading">📋 {t("Data Collection Criteria", "데이터 수집 기준")}</h3>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="gradient-card rounded-b-xl border border-t-0 border-border p-6 md:p-8">
          {/* Live collection stats */}
          <div className="mb-5 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <h4 className="text-sm font-semibold mb-2">{t("📊 LG.com Review Collection Status (Jan 2025 ~ Present)", "📊 LG.com 리뷰 수집 현황 (2025년 1월 ~ 현재)")}</h4>
            <div className="grid grid-cols-1 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <div>
                  <span className="text-muted-foreground">🇺🇸 US:</span>{" "}
                  <span className="font-bold text-foreground">{counts.us2025.toLocaleString()}</span>
                  <span className="text-muted-foreground"> / ~{BV_2025_US.toLocaleString()}{t(" reviews (since Jan 2025)", "건 (25년 1월 이후)")}</span>
                  <span className="ml-1 text-primary font-semibold">({((counts.us2025 / BV_2025_US) * 100).toFixed(1)}%)</span>
                </div>
                <span className="text-[10px] text-muted-foreground/60 ml-5">{t(`Total all-time: ${BV_TOTAL_US.toLocaleString()} reviews · Collected: ${counts.us.toLocaleString()}`, `전체 누적: ${BV_TOTAL_US.toLocaleString()}건 · 수집 완료: ${counts.us.toLocaleString()}건`)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div>
                  <span className="text-muted-foreground">🇬🇧 UK:</span>{" "}
                  <span className="font-bold text-foreground">{counts.uk2025.toLocaleString()}</span>
                  <span className="text-muted-foreground"> / ~{BV_2025_UK.toLocaleString()}{t(" reviews (since Jan 2025)", "건 (25년 1월 이후)")}</span>
                  <span className="ml-1 text-primary font-semibold">({((counts.uk2025 / BV_2025_UK) * 100).toFixed(1)}%)</span>
                </div>
                <span className="text-[10px] text-muted-foreground/60 ml-5">{t(`Total all-time: ${BV_TOTAL_UK.toLocaleString()} reviews · Collected: ${counts.uk.toLocaleString()}`, `전체 누적: ${BV_TOTAL_UK.toLocaleString()}건 · 수집 완료: ${counts.uk.toLocaleString()}건`)}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">{t("Source: Bazaarvoice Conversations API (Production) · All product categories · Batch pagination collection", "출처: Bazaarvoice Conversations API (Production) · 전 제품 카테고리 · 배치 페이지네이션 수집")}</p>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {t(
              "This dashboard provides sentiment analysis and marketing insights based on data collected according to the criteria below. Top 10 countries were selected by combining Reddit user counts (WorldPopulationReview), English usage proportion, and lg.com traffic (SimilarWeb).",
              "본 대시보드는 아래 기준에 따라 수집된 데이터를 기반으로 감성 분석 및 마케팅 인사이트를 제공합니다. Reddit 국가별 사용자 수(WorldPopulationReview), 영어 사용 비중, lg.com 트래픽(SimilarWeb)을 종합하여 상위 10개국을 선정하였습니다."
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {criteria.map((c) => {
              const Icon = c.icon;
              const title = t(c.titleEn, c.titleKo);
              const items = t(c.titleEn, c.titleKo) === c.titleEn ? c.itemsEn : c.itemsKo;
              return (
                <div key={c.titleEn} className="rounded-lg border border-border bg-background/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                    <h4 className="font-semibold font-heading text-sm">{title}</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
