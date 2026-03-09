export interface Review {
  id: string;
  source: "reddit" | "amazon";
  author: string;
  text: string;
  date: string;
  rating?: number;
  sentiment?: "positive" | "negative" | "neutral";
  score?: number;
}

export interface ProductData {
  name: string;
  reviews: Review[];
}

export const dummyProducts: Record<string, ProductData> = {
  "LG OLED C4": {
    name: "LG OLED C4",
    reviews: [
      { id: "r1", source: "reddit", author: "u/tv_enthusiast", text: "The LG OLED C4 is absolutely stunning. The picture quality is unreal, especially in dark scenes. HDR content looks amazing and the blacks are truly infinite. Best TV I've ever owned!", date: "2025-12-15", sentiment: "positive", score: 0.95 },
      { id: "r2", source: "reddit", author: "u/home_theater_guy", text: "Gaming on the C4 is incredible. 4K 120fps with VRR and near-zero input lag. Dolby Vision gaming is a game changer. Worth every penny.", date: "2025-11-20", sentiment: "positive", score: 0.91 },
      { id: "r3", source: "amazon", author: "TechReviewer99", text: "Great TV overall but I'm worried about burn-in. Had my previous OLED for 3 years and started seeing some retention. LG says they improved it but time will tell.", date: "2025-10-05", rating: 4, sentiment: "neutral", score: 0.45 },
      { id: "r4", source: "amazon", author: "MovieBuff2024", text: "The webOS interface is slow and bloated. Too many ads on the home screen. The picture is great but the software experience is frustrating.", date: "2025-09-18", rating: 3, sentiment: "negative", score: 0.2 },
      { id: "r5", source: "reddit", author: "u/budget_buyer", text: "Price dropped significantly this year. Got it for under $1200. At this price point, absolutely no competition. The AI upscaling is noticeably better than last gen.", date: "2025-11-01", sentiment: "positive", score: 0.88 },
      { id: "r6", source: "amazon", author: "SoundLover", text: "Built-in speakers are disappointing for a TV at this price. Had to buy a separate soundbar. The TV itself is gorgeous though.", date: "2025-08-22", rating: 3, sentiment: "negative", score: 0.25 },
      { id: "r7", source: "reddit", author: "u/color_accurate", text: "Color accuracy out of the box is phenomenal. Filmmaker mode is perfect. No calibration needed for casual viewing. 10-bit panel really shows in gradients.", date: "2025-12-01", sentiment: "positive", score: 0.93 },
      { id: "r8", source: "amazon", author: "EarlyAdopter", text: "Absolutely love this TV. Setup was easy, picture is breathtaking, and the thin design looks amazing on the wall. Five stars!", date: "2025-10-30", rating: 5, sentiment: "positive", score: 0.96 },
    ],
  },
  "LG Gram 17": {
    name: "LG Gram 17",
    reviews: [
      { id: "g1", source: "reddit", author: "u/ultralight_fan", text: "At 1.35kg for a 17-inch laptop, the Gram 17 is engineering magic. I carry it everywhere and my back thanks me. Battery lasts all day too.", date: "2025-11-10", sentiment: "positive", score: 0.92 },
      { id: "g2", source: "amazon", author: "BusinessPro", text: "Perfect for productivity. The large 16:10 screen is great for spreadsheets. Keyboard feel is decent but trackpad could be better.", date: "2025-10-15", rating: 4, sentiment: "positive", score: 0.72 },
      { id: "g3", source: "reddit", author: "u/gamer_lite", text: "Don't buy this for gaming. The integrated graphics can barely handle basic games. It's a productivity machine, not an entertainment device.", date: "2025-09-28", sentiment: "negative", score: 0.18 },
      { id: "g4", source: "amazon", author: "FrequentFlyer", text: "Build quality feels a bit plasticky. At this price I expected more premium materials. Screen flexes when you press on it.", date: "2025-08-05", rating: 3, sentiment: "negative", score: 0.22 },
      { id: "g5", source: "reddit", author: "u/battery_life_matters", text: "20 hours of real-world battery life. Not exaggerating. This thing just keeps going. Best battery life of any laptop I've used.", date: "2025-12-08", sentiment: "positive", score: 0.94 },
      { id: "g6", source: "amazon", author: "StudentUser", text: "Great laptop for school. Lightweight, long battery, nice screen. Only complaint is the speaker quality is quite poor.", date: "2025-11-22", rating: 4, sentiment: "positive", score: 0.78 },
    ],
  },
  "LG 인버터 세탁기": {
    name: "LG 인버터 세탁기",
    reviews: [
      { id: "w1", source: "reddit", author: "u/clean_freak", text: "LG 인버터 세탁기 진짜 조용해요. 이전 세탁기는 탈수할 때 집이 흔들렸는데, 이건 돌아가는지도 모를 정도. 에너지 효율도 좋고 강추합니다!", date: "2025-11-05", sentiment: "positive", score: 0.93 },
      { id: "w2", source: "amazon", author: "주부9단", text: "세탁력은 좋은데 건조 기능이 아쉬워요. 완전 건조가 안 되고 축축한 느낌이 남아요. 세탁만 놓고 보면 훌륭합니다.", date: "2025-10-20", rating: 3, sentiment: "neutral", score: 0.45 },
      { id: "w3", source: "reddit", author: "u/smart_home_kr", text: "ThinQ 앱 연동이 편해요. 밖에서도 세탁 상태 확인하고 원격으로 작동 가능. 스마트홈 구축하시는 분들께 추천!", date: "2025-12-01", sentiment: "positive", score: 0.87 },
      { id: "w4", source: "amazon", author: "실망한소비자", text: "2년 만에 고장 났어요. AS 비용도 비싸고 대기 시간도 길었습니다. 내구성이 걱정됩니다.", date: "2025-09-15", rating: 2, sentiment: "negative", score: 0.12 },
      { id: "w5", source: "reddit", author: "u/eco_warrior", text: "물 사용량이 기존 대비 40% 절약돼요. 전기료도 체감될 정도로 줄었습니다. 환경도 생각하는 좋은 제품이에요.", date: "2025-11-28", sentiment: "positive", score: 0.9 },
    ],
  },
};

export const getProductNames = (): string[] => Object.keys(dummyProducts);

export const searchProducts = (query: string): ProductData | null => {
  const normalizedQuery = query.toLowerCase().trim();
  for (const [key, value] of Object.entries(dummyProducts)) {
    if (key.toLowerCase().includes(normalizedQuery) || normalizedQuery.includes(key.toLowerCase())) {
      return value;
    }
  }
  return null;
};
