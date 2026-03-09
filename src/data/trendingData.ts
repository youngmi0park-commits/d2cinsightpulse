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
  { keyword: "picture quality", count: 2841, sentiment: "positive", change: 15 },
  { keyword: "burn-in", count: 1876, sentiment: "negative", change: -8 },
  { keyword: "gaming performance", count: 1654, sentiment: "positive", change: 32 },
  { keyword: "brightness", count: 1432, sentiment: "positive", change: 45 },
  { keyword: "price too high", count: 1298, sentiment: "negative", change: 12 },
  { keyword: "color accuracy", count: 1187, sentiment: "positive", change: 21 },
  { keyword: "webOS ads", count: 1098, sentiment: "negative", change: 28 },
  { keyword: "build quality", count: 987, sentiment: "positive", change: 5 },
  { keyword: "speaker quality", count: 876, sentiment: "negative", change: -3 },
  { keyword: "HDR performance", count: 812, sentiment: "positive", change: 18 },
  { keyword: "input lag", count: 743, sentiment: "positive", change: 9 },
  { keyword: "software bugs", count: 698, sentiment: "negative", change: 34 },
];

export const amazonKeywords: TrendingKeyword[] = [
  { keyword: "easy setup", count: 3214, sentiment: "positive", change: 22 },
  { keyword: "value for money", count: 2876, sentiment: "positive", change: 8 },
  { keyword: "delivery damage", count: 1987, sentiment: "negative", change: 15 },
  { keyword: "picture quality", count: 1876, sentiment: "positive", change: 11 },
  { keyword: "warranty issues", count: 1654, sentiment: "negative", change: 25 },
  { keyword: "energy efficient", count: 1432, sentiment: "positive", change: 18 },
  { keyword: "noise level", count: 1298, sentiment: "negative", change: -5 },
  { keyword: "smart features", count: 1187, sentiment: "positive", change: 33 },
  { keyword: "customer service", count: 1098, sentiment: "negative", change: 19 },
  { keyword: "durability", count: 987, sentiment: "positive", change: 7 },
  { keyword: "overheating", count: 876, sentiment: "negative", change: 42 },
  { keyword: "design", count: 812, sentiment: "positive", change: 14 },
];
