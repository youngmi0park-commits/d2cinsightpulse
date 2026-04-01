/**
 * TV & webOS Sales-Com Marketing Guide
 * Source: 고객 세일즈컴 자료 — TV 제품군 및 webOS
 * lg.com PDP 영어 표현 기준 적용
 */

export interface TvSegmentGuide {
  key: string;
  label: string;
  color: string;
  vocPatterns: string[];
  sellingPoints: string[];
  /** lg.com PDP 영어 표현 */
  pdpPhrases: string[];
}

export const TV_MARKETING_GUIDES: TvSegmentGuide[] = [
  {
    key: "nano_4k",
    label: "NANO 4K UHD",
    color: "#3B82F6",
    vocPatterns: [
      "저가 중국 UHD와 뭐가 다른지 모르겠다",
      "화질 선명도·명암비가 아쉽다",
      "AI 기능·보안·OS 업데이트 중요",
      "디자인이 너무 투박해 보인다",
    ],
    sellingPoints: [
      "Nano Detail Enhancer 기반 '정교한 4K 선명도'",
      "α7/α8 AI Processor + HDR10 Pro 화질 최적화",
      "Linear Flow Design: 실제 프리미엄 디자인 가치",
      "Award-winning webOS / Multi-AI / 보안(LG Shield)",
      "5년 무료 업그레이드로 오래 쓰는 TV",
      "LG Channels 무료 콘텐츠 접근성",
    ],
    pdpPhrases: [
      "Nano Detail Enhancer for refined 4K clarity",
      "α8 AI Processor with HDR10 Pro optimization",
      "Linear Flow Design — premium from every angle",
      "Award-winning webOS with Multi-AI built in",
      "LG Shield security & 5-year free upgrades via Re:New Program",
      "Free access to 300+ LG Channels",
    ],
  },
  {
    key: "art_tv",
    label: "ART TV (Gallery TV)",
    color: "#22C55E",
    vocPatterns: [
      "TV를 인테리어 오브제로 두고 싶다",
      "SS Frame 대비 차별점이 궁금",
      "예술 작품, 아트 콘텐츠 다양성",
      "프레임/디자인 완성도가 중요",
    ],
    sellingPoints: [
      "9mm class 초슬림, Flush-fit 갤러리 디자인",
      "5000+ 아트 콘텐츠 + 생성형 AI 아트(Gemini)",
      "기본 제공 마그넷 프레임(경쟁사는 별도 구매)",
      "매트 스크린 최적화: 예술 작품에 특화된 표현력",
      "Mini LED · QNED Color 기반 실제 작품 같은 색감",
      "프리미엄 인테리어 & 공간가치 완성",
    ],
    pdpPhrases: [
      "9mm class ultra-slim Flush-Fit Gallery Design",
      "5,000+ curated artworks & AI-generated art with Gemini",
      "Included magnetic frame — no extra purchase needed",
      "Matte Display optimized for true-to-life art reproduction",
      "Mini LED with QNED Color Technology for gallery-grade colors",
      "Elevate your space with premium interior design",
    ],
  },
  {
    key: "oled_evo",
    label: "OLED evo (W/G/C Series)",
    color: "#EF4444",
    vocPatterns: [
      "완벽한 화질·블랙 표현 중요",
      "밝은 거실에서도 화질 유지?",
      "게임 성능(응답속도·지연·주사율) 중요",
      "고급형 디자인 완성도",
    ],
    sellingPoints: [
      "Hyper Radiant Color Tech & Perfect Black",
      "Brightness Booster Ultra(최대 3.9배 밝기)",
      "Reflection Free Premium = 거실·밝은 환경 최적",
      "알파11 Dual AI Processor: NPU/CPU/GPU 대폭 향상",
      "게이밍 끝판왕: 0.1ms / 4K165Hz / G‑Sync/FreeSync / ClearMR10000 / 무선저지연 3ms",
      "Zero Connect Box / Wallpaper 슬림 디자인",
    ],
    pdpPhrases: [
      "Hyper Radiant Color Technology with Perfect Black",
      "Brightness Booster Ultra — up to 3.9x brighter",
      "Reflection Free Premium for bright-room viewing",
      "α11 Dual AI Processor with enhanced NPU, CPU & GPU",
      "Ultimate gaming: 0.1ms response · 4K 165Hz · G-Sync & FreeSync Compatible · ClearMR 10000",
      "Zero Connect Box with Wallpaper-slim design",
    ],
  },
  {
    key: "micro_mini_rgb",
    label: "Micro RGB evo / Mini RGB evo",
    color: "#F97316",
    vocPatterns: [
      "Mini LED보다 더 나아진 색 정확도?",
      "스포츠/게임에서 잔상·밝기·색 왜곡 없음?",
      "SS Micro LED 대비 차별점?",
    ],
    sellingPoints: [
      "업계 최초 Triple 100% Color (BT2020/DCI-P3/Adobe RGB)",
      "α11 Dual AI Engine → 830만 픽셀 정밀 제어",
      "330Hz Full HD / 4K 120Hz HDR 클라우드 게이밍",
      "BT Ultra Low Latency 무선 기술 (3ms 이하)",
      "정밀한 RGB LED 제어로 Mini LED 대비 압도적 컬러 순도",
      "Glare Free 대비 밝기·블랙 왜곡 없는 정교한 화질",
    ],
    pdpPhrases: [
      "Industry-first Triple 100% Color Volume (BT.2020 / DCI-P3 / Adobe RGB)",
      "α11 Dual AI Engine — precision control of 8.3 million pixels",
      "330Hz Full HD & 4K 120Hz HDR cloud gaming",
      "BT Ultra Low Latency wireless — under 3ms",
      "RGB LED precision for unmatched color purity beyond Mini LED",
      "Glare Free with no brightness or black distortion",
    ],
  },
  {
    key: "webos_ai",
    label: "webOS / AI Experience (Multi AI)",
    color: "#A855F7",
    vocPatterns: [
      "AI로 실제 도움 받는 기능이 있는가?",
      "업데이트·보안·OS 지속성 중요",
      "각 가족 구성원이 각각 맞는 콘텐츠 추천 원함",
    ],
    sellingPoints: [
      "Gemini + Copilot 기반 Multi AI",
      "AI Voice ID → 자동 개인화 화면(My Page)",
      "AI Concierge → 취향 기반 추천/정보 제안",
      "AI Chatbot → 문제 해결 자동화",
      "AI Picture/Sound Wizard → 개인 맞춤 화질/음질",
      "LG Shield 보안 + 5년 업그레이드(Re:New Program)",
      "스포츠 포털/히트맵/승률 예측 + AI Sound Controller",
    ],
    pdpPhrases: [
      "Multi AI powered by Gemini & Copilot",
      "AI Voice ID — personalized My Page for every family member",
      "AI Concierge for tailored content recommendations",
      "AI Chatbot for instant troubleshooting",
      "AI Picture & Sound Wizard — auto-tuned to your preference",
      "LG Shield security with 5-year Re:New Program upgrades",
      "Sports Portal with heatmaps, win probability & AI Sound Controller",
    ],
  },
];

/**
 * Given a product name / model, find matching TV segment guides.
 * Returns all matching guides (can be multiple, e.g. webOS applies to all).
 */
export function findTvGuides(productName: string): TvSegmentGuide[] {
  const lower = productName.toLowerCase();
  const matched: TvSegmentGuide[] = [];

  const keywordMap: Record<string, string[]> = {
    nano_4k: ["nano", "ut", "4k uhd", "uq", "ur"],
    art_tv: ["art", "gallery", "easel"],
    oled_evo: ["oled", "evo", "c4", "c5", "g4", "g5", "m4", "m5", "w4", "w5", "b4", "b5"],
    micro_mini_rgb: ["micro rgb", "mini rgb", "rgb evo", "99t", "99s"],
    webos_ai: ["webos", "multi ai", "ai experience"],
  };

  for (const guide of TV_MARKETING_GUIDES) {
    const keywords = keywordMap[guide.key] || [];
    if (keywords.some(kw => lower.includes(kw))) {
      matched.push(guide);
    }
  }

  // webOS/AI guide is always relevant for TV products
  const webosGuide = TV_MARKETING_GUIDES.find(g => g.key === "webos_ai");
  if (webosGuide && !matched.includes(webosGuide) && matched.length > 0) {
    matched.push(webosGuide);
  }

  return matched;
}
