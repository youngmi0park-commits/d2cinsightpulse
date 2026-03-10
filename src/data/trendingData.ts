export interface TrendingProduct {
  rank: number;
  modelNumber: string;
  displayName: string;
  category: string;
  mentions: number;
  sentimentScore: number; // 0-100
  trend: "up" | "down" | "stable";
  changePercent: number;
}

export interface TrendingKeyword {
  keyword: string;
  count: number;
  sentiment: "positive" | "negative";
  change: number; // percent change from last week
  relatedProducts?: string[]; // product display names associated with this keyword
  relatedCountries?: string[]; // countries where this keyword is frequently mentioned
}

export const redditTrending: TrendingProduct[] = [
  { rank: 1, modelNumber: "OLED97G5WUA", displayName: "OLED evo G5 97\"", category: "TV", mentions: 1842, sentimentScore: 89, trend: "up", changePercent: 23 },
  { rank: 2, modelNumber: "52G930B-B", displayName: "UltraGear evo G9 52\"", category: "Monitor", mentions: 1567, sentimentScore: 92, trend: "up", changePercent: 45 },
  { rank: 3, modelNumber: "OLED65G6WUA", displayName: "OLED evo G6 65\"", category: "TV", mentions: 1203, sentimentScore: 94, trend: "up", changePercent: 78 },
  { rank: 4, modelNumber: "17Z90TL-H.AUB9U1", displayName: "gram 17\" Copilot+", category: "Laptop", mentions: 987, sentimentScore: 81, trend: "stable", changePercent: 2 },
  { rank: 5, modelNumber: "34GS95QE-B", displayName: "UltraGear OLED 34\"", category: "Monitor", mentions: 876, sentimentScore: 88, trend: "up", changePercent: 15 },
  { rank: 6, modelNumber: "WKHC252HBA", displayName: "WashTower™ Center Control", category: "Home Appliance", mentions: 743, sentimentScore: 76, trend: "down", changePercent: -8 },
  { rank: 7, modelNumber: "PU615U", displayName: "CineBeam S 4K UST", category: "Projector", mentions: 654, sentimentScore: 85, trend: "up", changePercent: 31 },
  { rank: 8, modelNumber: "OLED83C4PUA", displayName: "OLED C4 83\"", category: "TV", mentions: 612, sentimentScore: 82, trend: "stable", changePercent: -1 },
  { rank: 9, modelNumber: "27GS95QE-B", displayName: "UltraGear OLED 27\"", category: "Monitor", mentions: 589, sentimentScore: 90, trend: "up", changePercent: 19 },
  { rank: 10, modelNumber: "S95TR", displayName: "Soundbar S95TR", category: "Audio", mentions: 534, sentimentScore: 87, trend: "up", changePercent: 12 },
];

export const amazonTrending: TrendingProduct[] = [
  { rank: 1, modelNumber: "OLED65G6WUA", displayName: "OLED evo G6 65\"", category: "TV", mentions: 2341, sentimentScore: 91, trend: "up", changePercent: 62 },
  { rank: 2, modelNumber: "OLED97G5WUA", displayName: "OLED evo G5 97\"", category: "TV", mentions: 1923, sentimentScore: 86, trend: "up", changePercent: 18 },
  { rank: 3, modelNumber: "WKHC252HBA", displayName: "WashTower™ Center Control", category: "Home Appliance", mentions: 1654, sentimentScore: 73, trend: "stable", changePercent: 3 },
  { rank: 4, modelNumber: "17Z90TL-H.AUB9U1", displayName: "gram 17\" Copilot+", category: "Laptop", mentions: 1432, sentimentScore: 79, trend: "up", changePercent: 11 },
  { rank: 5, modelNumber: "PU615U", displayName: "CineBeam S 4K UST", category: "Projector", mentions: 1287, sentimentScore: 83, trend: "up", changePercent: 28 },
  { rank: 6, modelNumber: "52G930B-B", displayName: "UltraGear evo G9 52\"", category: "Monitor", mentions: 1098, sentimentScore: 90, trend: "up", changePercent: 35 },
  { rank: 7, modelNumber: "OLED83C4PUA", displayName: "OLED C4 83\"", category: "TV", mentions: 987, sentimentScore: 84, trend: "down", changePercent: -5 },
  { rank: 8, modelNumber: "S95TR", displayName: "Soundbar S95TR", category: "Audio", mentions: 876, sentimentScore: 88, trend: "up", changePercent: 22 },
  { rank: 9, modelNumber: "34GS95QE-B", displayName: "UltraGear OLED 34\"", category: "Monitor", mentions: 765, sentimentScore: 91, trend: "up", changePercent: 14 },
  { rank: 10, modelNumber: "LRGL5823S", displayName: "Gas Range 5.8 cu ft", category: "Home Appliance", mentions: 654, sentimentScore: 71, trend: "down", changePercent: -12 },
];

export const redditKeywords: TrendingKeyword[] = [
  { keyword: "picture quality", count: 2841, sentiment: "positive", change: 15, relatedProducts: ["OLED evo G5 97\"", "OLED evo G6 65\""] },
  { keyword: "burn-in", count: 1876, sentiment: "negative", change: -8, relatedProducts: ["OLED C4 83\""], relatedCountries: ["🇺🇸 US", "🇬🇧 UK", "🇩🇪 DE"] },
  { keyword: "gaming performance", count: 1654, sentiment: "positive", change: 32, relatedProducts: ["UltraGear evo G9 52\"", "UltraGear OLED 34\""] },
  { keyword: "brightness", count: 1432, sentiment: "positive", change: 45, relatedProducts: ["OLED evo G6 65\"", "OLED evo G5 97\""] },
  { keyword: "price too high", count: 1298, sentiment: "negative", change: 12, relatedProducts: ["OLED evo G5 97\""], relatedCountries: ["🇺🇸 US", "🇨🇦 CA", "🇦🇺 AU"] },
  { keyword: "color accuracy", count: 1187, sentiment: "positive", change: 21, relatedProducts: ["OLED evo G6 65\"", "UltraGear OLED 34\""] },
  { keyword: "webOS ads", count: 1098, sentiment: "negative", change: 28, relatedProducts: ["OLED C4 83\"", "OLED evo G5 97\""], relatedCountries: ["🇺🇸 US", "🇬🇧 UK", "🇨🇦 CA", "🇦🇺 AU"] },
  { keyword: "build quality", count: 987, sentiment: "positive", change: 5, relatedProducts: ["gram 17\" Copilot+"] },
  { keyword: "speaker quality", count: 876, sentiment: "negative", change: -3, relatedProducts: ["OLED C4 83\""], relatedCountries: ["🇺🇸 US", "🇮🇳 IN"] },
  { keyword: "HDR performance", count: 812, sentiment: "positive", change: 18, relatedProducts: ["OLED evo G5 97\"", "OLED evo G6 65\""] },
  { keyword: "input lag", count: 743, sentiment: "positive", change: 9, relatedProducts: ["UltraGear evo G9 52\"", "UltraGear OLED 27\""] },
  { keyword: "software bugs", count: 698, sentiment: "negative", change: 34, relatedProducts: ["WashTower™ Center Control"], relatedCountries: ["🇺🇸 US", "🇰🇷 KR", "🇩🇪 DE"] },
];

export const amazonKeywords: TrendingKeyword[] = [
  { keyword: "easy setup", count: 3214, sentiment: "positive", change: 22, relatedProducts: ["OLED evo G6 65\"", "OLED C4 83\""] },
  { keyword: "value for money", count: 2876, sentiment: "positive", change: 8, relatedProducts: ["OLED C4 83\"", "Gas Range 5.8 cu ft"] },
  { keyword: "delivery damage", count: 1987, sentiment: "negative", change: 15, relatedProducts: ["OLED evo G5 97\""], relatedCountries: ["🇺🇸 US", "🇬🇧 UK"] },
  { keyword: "picture quality", count: 1876, sentiment: "positive", change: 11, relatedProducts: ["OLED evo G6 65\"", "OLED evo G5 97\""] },
  { keyword: "warranty issues", count: 1654, sentiment: "negative", change: 25, relatedProducts: ["WashTower™ Center Control"], relatedCountries: ["🇺🇸 US", "🇨🇦 CA", "🇮🇳 IN"] },
  { keyword: "energy efficient", count: 1432, sentiment: "positive", change: 18, relatedProducts: ["WashTower™ Center Control", "OLED evo G6 65\""] },
  { keyword: "noise level", count: 1298, sentiment: "negative", change: -5, relatedProducts: ["WashTower™ Center Control"], relatedCountries: ["🇺🇸 US", "🇩🇪 DE"] },
  { keyword: "smart features", count: 1187, sentiment: "positive", change: 33, relatedProducts: ["OLED evo G6 65\"", "OLED C4 83\""] },
  { keyword: "customer service", count: 1098, sentiment: "negative", change: 19, relatedProducts: ["Gas Range 5.8 cu ft"], relatedCountries: ["🇺🇸 US", "🇨🇦 CA"] },
  { keyword: "durability", count: 987, sentiment: "positive", change: 7, relatedProducts: ["gram 17\" Copilot+", "WashTower™ Center Control"] },
  { keyword: "overheating", count: 876, sentiment: "negative", change: 42, relatedProducts: ["gram 17\" Copilot+"], relatedCountries: ["🇺🇸 US", "🇮🇳 IN", "🇧🇷 BR"] },
  { keyword: "design", count: 812, sentiment: "positive", change: 14, relatedProducts: ["OLED evo G6 65\"", "UltraGear evo G9 52\""] },
];

export const rtingsTrending: TrendingProduct[] = [
  { rank: 1, modelNumber: "OLED97G5WUA", displayName: "OLED evo G5 97\"", category: "TV", mentions: 156, sentimentScore: 95, trend: "up", changePercent: 12 },
  { rank: 2, modelNumber: "OLED65G6WUA", displayName: "OLED evo G6 65\"", category: "TV", mentions: 142, sentimentScore: 96, trend: "up", changePercent: 55 },
  { rank: 3, modelNumber: "52G930B-B", displayName: "UltraGear evo G9 52\"", category: "Monitor", mentions: 134, sentimentScore: 94, trend: "up", changePercent: 38 },
  { rank: 4, modelNumber: "34GS95QE-B", displayName: "UltraGear OLED 34\"", category: "Monitor", mentions: 121, sentimentScore: 92, trend: "up", changePercent: 20 },
  { rank: 5, modelNumber: "OLED83C4PUA", displayName: "OLED C4 83\"", category: "TV", mentions: 98, sentimentScore: 88, trend: "stable", changePercent: 3 },
  { rank: 6, modelNumber: "PU615U", displayName: "CineBeam S 4K UST", category: "Projector", mentions: 87, sentimentScore: 86, trend: "up", changePercent: 18 },
  { rank: 7, modelNumber: "27GS95QE-B", displayName: "UltraGear OLED 27\"", category: "Monitor", mentions: 76, sentimentScore: 91, trend: "up", changePercent: 14 },
];

export const rtingsKeywords: TrendingKeyword[] = [
  { keyword: "color accuracy", count: 412, sentiment: "positive", change: 18, relatedProducts: ["OLED evo G6 65\"", "UltraGear OLED 34\""] },
  { keyword: "HDR brightness", count: 387, sentiment: "positive", change: 25, relatedProducts: ["OLED evo G5 97\"", "OLED evo G6 65\""] },
  { keyword: "response time", count: 354, sentiment: "positive", change: 12, relatedProducts: ["UltraGear evo G9 52\"", "UltraGear OLED 27\""] },
  { keyword: "reflection handling", count: 298, sentiment: "positive", change: 32, relatedProducts: ["OLED evo G5 97\""] },
  { keyword: "burn-in risk", count: 265, sentiment: "negative", change: -5, relatedProducts: ["OLED C4 83\""], relatedCountries: ["🇺🇸 US", "🇬🇧 UK"] },
  { keyword: "uniformity issues", count: 198, sentiment: "negative", change: 8, relatedProducts: ["UltraGear OLED 34\""], relatedCountries: ["🇺🇸 US", "🇩🇪 DE"] },
  { keyword: "input lag", count: 176, sentiment: "positive", change: 15, relatedProducts: ["UltraGear evo G9 52\""] },
  { keyword: "viewing angles", count: 154, sentiment: "negative", change: 11, relatedProducts: ["OLED C4 83\""], relatedCountries: ["🇺🇸 US"] },
];

export const trustedReviewsTrending: TrendingProduct[] = [
  { rank: 1, modelNumber: "OLED65G6WUA", displayName: "OLED evo G6 65\"", category: "TV", mentions: 89, sentimentScore: 94, trend: "up", changePercent: 65 },
  { rank: 2, modelNumber: "OLED97G5WUA", displayName: "OLED evo G5 97\"", category: "TV", mentions: 76, sentimentScore: 91, trend: "up", changePercent: 15 },
  { rank: 3, modelNumber: "52G930B-B", displayName: "UltraGear evo G9 52\"", category: "Monitor", mentions: 64, sentimentScore: 90, trend: "up", changePercent: 28 },
  { rank: 4, modelNumber: "17Z90TL-H.AUB9U1", displayName: "gram 17\" Copilot+", category: "Laptop", mentions: 52, sentimentScore: 83, trend: "stable", changePercent: 5 },
  { rank: 5, modelNumber: "PU615U", displayName: "CineBeam S 4K UST", category: "Projector", mentions: 41, sentimentScore: 84, trend: "up", changePercent: 22 },
];

export const trustedReviewsKeywords: TrendingKeyword[] = [
  { keyword: "build quality", count: 234, sentiment: "positive", change: 12, relatedProducts: ["gram 17\" Copilot+", "OLED evo G6 65\""] },
  { keyword: "value proposition", count: 198, sentiment: "positive", change: 8, relatedProducts: ["OLED evo G6 65\""] },
  { keyword: "software experience", count: 176, sentiment: "negative", change: 22, relatedProducts: ["gram 17\" Copilot+"], relatedCountries: ["🇬🇧 UK"] },
  { keyword: "design premium", count: 165, sentiment: "positive", change: 18, relatedProducts: ["OLED evo G6 65\"", "UltraGear evo G9 52\""] },
  { keyword: "overpriced", count: 143, sentiment: "negative", change: 15, relatedProducts: ["OLED evo G5 97\""], relatedCountries: ["🇬🇧 UK", "🇩🇪 DE"] },
  { keyword: "innovation", count: 132, sentiment: "positive", change: 30, relatedProducts: ["OLED evo G6 65\"", "CineBeam S 4K UST"] },
];

export const consumerReportsTrending: TrendingProduct[] = [
  { rank: 1, modelNumber: "OLED97G5WUA", displayName: "OLED evo G5 97\"", category: "TV", mentions: 210, sentimentScore: 93, trend: "up", changePercent: 20 },
  { rank: 2, modelNumber: "WKHC252HBA", displayName: "WashTower™ Center Control", category: "Home Appliance", mentions: 187, sentimentScore: 82, trend: "up", changePercent: 14 },
  { rank: 3, modelNumber: "OLED65G6WUA", displayName: "OLED evo G6 65\"", category: "TV", mentions: 165, sentimentScore: 92, trend: "up", changePercent: 48 },
  { rank: 4, modelNumber: "LRGL5823S", displayName: "Gas Range 5.8 cu ft", category: "Home Appliance", mentions: 132, sentimentScore: 74, trend: "down", changePercent: -6 },
  { rank: 5, modelNumber: "OLED83C4PUA", displayName: "OLED C4 83\"", category: "TV", mentions: 119, sentimentScore: 85, trend: "stable", changePercent: 2 },
  { rank: 6, modelNumber: "17Z90TL-H.AUB9U1", displayName: "gram 17\" Copilot+", category: "Laptop", mentions: 98, sentimentScore: 80, trend: "up", changePercent: 9 },
];

export const consumerReportsKeywords: TrendingKeyword[] = [
  { keyword: "reliability", count: 543, sentiment: "positive", change: 8, relatedProducts: ["WashTower™ Center Control", "OLED evo G5 97\""] },
  { keyword: "energy efficiency", count: 476, sentiment: "positive", change: 15, relatedProducts: ["WashTower™ Center Control", "OLED evo G6 65\""] },
  { keyword: "repair frequency", count: 387, sentiment: "negative", change: 12, relatedProducts: ["Gas Range 5.8 cu ft"], relatedCountries: ["🇺🇸 US", "🇨🇦 CA"] },
  { keyword: "safety rating", count: 354, sentiment: "positive", change: 5, relatedProducts: ["WashTower™ Center Control"] },
  { keyword: "noise output", count: 298, sentiment: "negative", change: 18, relatedProducts: ["WashTower™ Center Control"], relatedCountries: ["🇺🇸 US", "🇩🇪 DE", "🇳🇱 NL"] },
  { keyword: "owner satisfaction", count: 276, sentiment: "positive", change: 10, relatedProducts: ["OLED evo G5 97\"", "OLED evo G6 65\""] },
];

export const cnetTrending: TrendingProduct[] = [
  { rank: 1, modelNumber: "OLED65G6WUA", displayName: "OLED evo G6 65\"", category: "TV", mentions: 178, sentimentScore: 93, trend: "up", changePercent: 58 },
  { rank: 2, modelNumber: "52G930B-B", displayName: "UltraGear evo G9 52\"", category: "Monitor", mentions: 156, sentimentScore: 92, trend: "up", changePercent: 40 },
  { rank: 3, modelNumber: "OLED97G5WUA", displayName: "OLED evo G5 97\"", category: "TV", mentions: 143, sentimentScore: 90, trend: "up", changePercent: 16 },
  { rank: 4, modelNumber: "PU615U", displayName: "CineBeam S 4K UST", category: "Projector", mentions: 112, sentimentScore: 85, trend: "up", changePercent: 25 },
  { rank: 5, modelNumber: "17Z90TL-H.AUB9U1", displayName: "gram 17\" Copilot+", category: "Laptop", mentions: 98, sentimentScore: 82, trend: "stable", changePercent: 4 },
  { rank: 6, modelNumber: "WKHC252HBA", displayName: "WashTower™ Center Control", category: "Home Appliance", mentions: 87, sentimentScore: 79, trend: "up", changePercent: 11 },
];

export const cnetKeywords: TrendingKeyword[] = [
  { keyword: "editor's choice", count: 321, sentiment: "positive", change: 28, relatedProducts: ["OLED evo G6 65\"", "UltraGear evo G9 52\""] },
  { keyword: "best in class", count: 287, sentiment: "positive", change: 22, relatedProducts: ["OLED evo G6 65\""] },
  { keyword: "price concern", count: 243, sentiment: "negative", change: 10, relatedProducts: ["OLED evo G5 97\""] },
  { keyword: "smart features", count: 212, sentiment: "positive", change: 35, relatedProducts: ["OLED evo G6 65\"", "CineBeam S 4K UST"] },
  { keyword: "software bloat", count: 187, sentiment: "negative", change: 18, relatedProducts: ["OLED C4 83\""] },
  { keyword: "future-proof", count: 165, sentiment: "positive", change: 14, relatedProducts: ["UltraGear evo G9 52\"", "OLED evo G6 65\""] },
];

export const trustpilotTrending: TrendingProduct[] = [
  { rank: 1, modelNumber: "WKHC252HBA", displayName: "WashTower™ Center Control", category: "Home Appliance", mentions: 432, sentimentScore: 71, trend: "stable", changePercent: 2 },
  { rank: 2, modelNumber: "LRGL5823S", displayName: "Gas Range 5.8 cu ft", category: "Home Appliance", mentions: 321, sentimentScore: 65, trend: "down", changePercent: -8 },
  { rank: 3, modelNumber: "OLED97G5WUA", displayName: "OLED evo G5 97\"", category: "TV", mentions: 287, sentimentScore: 78, trend: "up", changePercent: 12 },
  { rank: 4, modelNumber: "OLED83C4PUA", displayName: "OLED C4 83\"", category: "TV", mentions: 198, sentimentScore: 74, trend: "stable", changePercent: -1 },
  { rank: 5, modelNumber: "17Z90TL-H.AUB9U1", displayName: "gram 17\" Copilot+", category: "Laptop", mentions: 165, sentimentScore: 76, trend: "up", changePercent: 8 },
];

export const trustpilotKeywords: TrendingKeyword[] = [
  { keyword: "customer service", count: 876, sentiment: "negative", change: 20, relatedProducts: ["WashTower™ Center Control", "Gas Range 5.8 cu ft"] },
  { keyword: "delivery experience", count: 654, sentiment: "positive", change: 5, relatedProducts: ["OLED evo G5 97\""] },
  { keyword: "warranty claim", count: 543, sentiment: "negative", change: 15, relatedProducts: ["WashTower™ Center Control"] },
  { keyword: "product quality", count: 487, sentiment: "positive", change: 8, relatedProducts: ["OLED evo G5 97\"", "OLED C4 83\""] },
  { keyword: "repair delay", count: 398, sentiment: "negative", change: 25, relatedProducts: ["Gas Range 5.8 cu ft"] },
  { keyword: "value for money", count: 354, sentiment: "positive", change: 12, relatedProducts: ["OLED C4 83\"", "gram 17\" Copilot+"] },
];

export const bestreviewsTrending: TrendingProduct[] = [
  { rank: 1, modelNumber: "WKHC252HBA", displayName: "WashTower™ Center Control", category: "Home Appliance", mentions: 98, sentimentScore: 84, trend: "up", changePercent: 18 },
  { rank: 2, modelNumber: "OLED97G5WUA", displayName: "OLED evo G5 97\"", category: "TV", mentions: 87, sentimentScore: 91, trend: "up", changePercent: 14 },
  { rank: 3, modelNumber: "OLED65G6WUA", displayName: "OLED evo G6 65\"", category: "TV", mentions: 76, sentimentScore: 93, trend: "up", changePercent: 52 },
  { rank: 4, modelNumber: "PU615U", displayName: "CineBeam S 4K UST", category: "Projector", mentions: 65, sentimentScore: 82, trend: "up", changePercent: 20 },
  { rank: 5, modelNumber: "LRGL5823S", displayName: "Gas Range 5.8 cu ft", category: "Home Appliance", mentions: 54, sentimentScore: 73, trend: "down", changePercent: -5 },
];

export const bestreviewsKeywords: TrendingKeyword[] = [
  { keyword: "top pick", count: 198, sentiment: "positive", change: 22, relatedProducts: ["OLED evo G5 97\"", "WashTower™ Center Control"] },
  { keyword: "best value", count: 176, sentiment: "positive", change: 15, relatedProducts: ["OLED evo G6 65\""] },
  { keyword: "ease of use", count: 154, sentiment: "positive", change: 18, relatedProducts: ["WashTower™ Center Control", "CineBeam S 4K UST"] },
  { keyword: "durability concern", count: 132, sentiment: "negative", change: 10, relatedProducts: ["Gas Range 5.8 cu ft"] },
  { keyword: "installation hassle", count: 109, sentiment: "negative", change: 8, relatedProducts: ["WashTower™ Center Control"] },
  { keyword: "recommended", count: 98, sentiment: "positive", change: 25, relatedProducts: ["OLED evo G6 65\"", "CineBeam S 4K UST"] },
];
