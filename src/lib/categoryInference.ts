/**
 * Common category inference utility.
 * When products.category = 'General' (or empty), infer the proper category
 * from model_number / display_name using regex heuristics.
 *
 * Used across:
 *  - TrendingDashboard (top keyword cards)
 *  - OverviewDashboard (marketing opportunity matrix)
 *  - LgComProductInsightCards (LG.com insight cards)
 *  - RedditVocPostCards (Reddit insight cards)
 */

/** Map English DB category → Korean label */
export const CATEGORY_KO: Record<string, string> = {
  TV: "TV",
  Monitor: "모니터",
  Refrigerator: "냉장고",
  Washer: "세탁기",
  Dryer: "건조기",
  Dishwasher: "식기세척기",
  Kitchen: "주방가전",
  Vacuum: "청소기",
  "Air Conditioner": "에어컨",
  "Air Care": "공기청정기",
  "Air Purifier": "공기청정기",
  Soundbar: "사운드바",
  Audio: "오디오",
  Projector: "프로젝터",
  Laptop: "노트북",
  Styler: "스타일러",
  Microwave: "전자레인지",
  "Range/Oven": "오븐/레인지",
  Cooktop: "쿡탑",
  Dehumidifier: "제습기",
  Accessory: "액세서리",
  General: "",
};

/** Infer English category from model_number + display_name. Returns "" if unknown. */
export function inferCategoryEn(model?: string | null, displayName?: string | null): string {
  const m = (model || "").toUpperCase();
  const d = (displayName || "").toUpperCase();
  const t = `${m} ${d}`;

  if (/^GL-[A-Z]?[BDFNPMTRS]|^GR-|^GC-|^GM-|^LRF|^LRG|^LRM|^LRY|^LF\d|^LFX|^LFC|^LSXS|^LMXS|INSTAVIEW|REFRIGER|FRENCH.?DOOR/.test(t))
    return "Refrigerator";
  if (/^WM\d|^WT\d|^F\d+[A-Z]|^FV\d|^WKEX|^WKGX|WASHTOWER|WASH(ER|ING)/.test(t)) return "Washer";
  if (/^DL[A-Z]X|^DLGX|^DLEX|^RD\d|DRYER/.test(t)) return "Dryer";
  if (/^LDP|^LDFN|^LDT\d|^LDF\d|DISHWASH|QUADWASH/.test(t)) return "Dishwasher";
  if (/^A9[A-Z]|CORDZERO|VACUUM/.test(t)) return "Vacuum";
  if (/ARTCOOL|DUAL.?COOL|^S\d+Q|AIR.?CONDITION/.test(t)) return "Air Conditioner";
  if (/PURICARE|^AS\d|AIR.?PURIF/.test(t)) return "Air Purifier";
  if (/^OLED|^QNED|^NANO\d|^\d+UR|^\d+UQ|^\d+UT|^\d+UH|^\d+NANO|^\d+QNED|^\d+OLED/.test(t)) return "TV";
  if (/^SP\d|^S[A-Z]\d[A-Z]|SOUNDBAR|XBOOM/.test(t)) return "Audio";
  if (/GRAM|ULTRAPC|^\d+Z\d|LAPTOP/.test(t)) return "Laptop";
  if (/STYLER|^S3[A-Z]|^S5[A-Z]/.test(t)) return "Styler";
  if (/MONITOR|ULTRAGEAR|ULTRAFINE|^\d+UP|^\d+GP|^\d+GR|^\d+WP|^\d+MP/.test(t)) return "Monitor";
  if (/^MVE|^LMC|^LMV|^LMH|MICROWAVE/.test(t)) return "Microwave";
  if (/^LSE|^LDE|^LRE|RANGE|OVEN/.test(t)) return "Range/Oven";
  if (/^PF|^HU\d|PROJECTOR|CINEBEAM/.test(t)) return "Projector";
  return "";
}

/**
 * Resolve final English category — if DB says General/empty, fall back to inference.
 * Returns "" when nothing can be inferred (so callers can hide the badge).
 */
export function resolveCategoryEn(
  dbCategory?: string | null,
  model?: string | null,
  displayName?: string | null,
): string {
  const c = (dbCategory || "").trim();
  if (c && c !== "General") return c;
  return inferCategoryEn(model, displayName);
}

/** Resolve to Korean label. Returns "" if unknown (so UI can hide the chip). */
export function resolveCategoryKo(
  dbCategory?: string | null,
  model?: string | null,
  displayName?: string | null,
): string {
  const en = resolveCategoryEn(dbCategory, model, displayName);
  if (!en) return "";
  return CATEGORY_KO[en] ?? en;
}
