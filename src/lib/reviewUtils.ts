/** Sources whose full text must never be displayed */
export const PRIVACY_RESTRICTED_SOURCES = [
  "lgcom",
  "lg.com",
  "lg_com",
  "lge_com",
  "lgdotcom",
] as const;

export type ReviewSource = (typeof PRIVACY_RESTRICTED_SOURCES)[number] | string;

/** Returns true if this source hides review text */
export const isPrivacyRestricted = (source: string | undefined | null): boolean => {
  if (!source) return false;
  const normalized = source.toLowerCase().replace(/[\s._-]/g, "");
  return PRIVACY_RESTRICTED_SOURCES.some(
    (s) => normalized.startsWith(s.replace(/[\s._-]/g, ""))
  );
};

/** Returns true if review_text is a privacy placeholder */
export const isPrivacyPlaceholder = (text: string | null | undefined): boolean => {
  if (!text) return true;
  const lower = text.toLowerCase();
  return (
    lower.includes("개인정보") ||
    lower.includes("privacy") ||
    lower.includes("표시되지 않") ||
    lower.includes("not displayed") ||
    lower.includes("lg 리뷰 — 감성") ||
    text.trim().length < 5
  );
};

/** Sanitized review text — returns null if restricted */
export const getSafeReviewText = (
  text: string | null | undefined,
  source: string | undefined | null
): string | null => {
  if (isPrivacyRestricted(source)) return null;
  if (isPrivacyPlaceholder(text)) return null;
  return text ?? null;
};

/** Generate sentiment-based summary for LG.com reviews */
export const getLgComSentimentSummary = (
  sentiment?: string,
  title?: string | null
): string => {
  const sentLabel =
    sentiment === "positive"
      ? "👍 긍정적 사용 경험 확인"
      : sentiment === "negative"
        ? "👎 불만 또는 개선 요청 확인"
        : "➖ 중립적 의견";
  if (title) return `${sentLabel} — ${title}`;
  return sentLabel;
};

/** Check if a set of reviews is entirely from privacy-restricted sources */
export const isAllPrivacyRestricted = (reviews: { source?: string }[]): boolean => {
  if (reviews.length === 0) return false;
  return reviews.every((r) => isPrivacyRestricted(r.source));
};

const extractThemeLabel = (keyword: string): string => keyword.split(/\s+[–-]\s+/)[0]?.trim() || "";

/** Privacy-safe theme labels derived from processed keywords */
export const getPrivacySafeThemeLabels = (keywords: string[], limit = 4): string[] => {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const keyword of keywords) {
    const theme = extractThemeLabel(keyword);
    if (!theme || theme === "General" || seen.has(theme)) continue;
    seen.add(theme);
    labels.push(theme);
    if (labels.length >= limit) break;
  }

  return labels;
};

/** Secondary-processed summaries for privacy-restricted review sources */
export const buildPrivacySafeKeywordSummaries = (
  keywords: string[],
  sentiment: "positive" | "negative",
  limit = 4
): string[] => {
  const themes = getPrivacySafeThemeLabels(keywords, limit);
  return themes.map((theme) =>
    sentiment === "positive" ? `${theme} 관련 만족 의견` : `${theme} 관련 개선 의견`
  );
};

// ═══════════════════════════════════════════════════════════════════
// PII MASKING — Strong mode
// 이름, 이메일, 전화, 주소, 시리얼 번호, URL, 숫자ID 등을 모두 [마스킹]
// ═══════════════════════════════════════════════════════════════════
export const maskPII = (input: string): string => {
  if (!input) return "";
  let s = input;

  // 1) Email
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[이메일]");
  // 2) URL
  s = s.replace(/\bhttps?:\/\/\S+/gi, "[링크]");
  s = s.replace(/\bwww\.[\w.\-/?#=&%]+/gi, "[링크]");
  // 3) 전화번호 (국제/국내 다양한 패턴)
  s = s.replace(/\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, "[전화]");
  s = s.replace(/\b\d{3}[\s.-]\d{3,4}[\s.-]\d{4}\b/g, "[전화]");
  // 4) 주소 패턴 (US 우편번호, 번지 + Street/Ave/Rd/Blvd 등)
  s = s.replace(/\b\d{1,6}\s+[A-Z][a-zA-Z]+\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Way|Ct|Court|Pl|Place)\b\.?/g, "[주소]");
  s = s.replace(/\b\d{5}(-\d{4})?\b/g, (m) => (/^\d{4,5}$/.test(m) && m.length === 5 ? "[우편번호]" : m));
  // 5) 시리얼/모델 번호 (영문 + 숫자 6자 이상 또는 # 포함)
  s = s.replace(/\b(serial|s\/n|sn|order|invoice|case|ticket|model)\s*[#:]?\s*[A-Z0-9-]{4,}/gi, "$1 [번호]");
  s = s.replace(/#\s?[A-Z0-9]{6,}/g, "[번호]");
  // 6) 신용카드/긴 숫자 ID (10자리 이상 연속)
  s = s.replace(/\b\d{10,}\b/g, "[ID]");
  // 7) 사람 이름 추정 ("My name is X", "I am X", "- John D.", "Sincerely, X")
  s = s.replace(/\bmy name is\s+[A-Z][a-zA-Z]+(\s+[A-Z]\.?)?/gi, "my name is [이름]");
  s = s.replace(/\b(sincerely|regards|thanks|thank you),?\s*[-–]?\s*[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]*\.?)?\s*$/gim, "$1");
  s = s.replace(/\b[A-Z][a-z]+\s[A-Z]\.\s/g, "[이름] ");

  return s.trim();
};

// ═══════════════════════════════════════════════════════════════════
// KEY PHRASE EXTRACTOR — privacy-safe snippet picker
// 본문에서 PII를 마스킹한 뒤 감성 신호가 강한 짧은 구문(2~3개)만 추출
// ═══════════════════════════════════════════════════════════════════
const POSITIVE_SIGNALS = [
  "love", "great", "excellent", "amazing", "perfect", "quiet", "smooth",
  "fast", "easy", "beautiful", "stunning", "recommend", "happy", "satisfied",
  "best", "impressed", "reliable", "spacious", "powerful", "vivid", "sleek",
  "comfortable", "convenient", "premium", "worth",
];
const NEGATIVE_SIGNALS = [
  "issue", "problem", "broken", "noisy", "loud", "slow", "disappointed",
  "defect", "fail", "leak", "stopped", "poor", "terrible", "awful",
  "bad", "wrong", "error", "stuck", "stink", "smell", "rust", "crack",
  "scratch", "dent", "missing", "delay", "wait", "frustrat", "regret",
];

/**
 * 리뷰 본문에서 PII 마스킹 후, 감성 신호어가 포함된 짧은 키프레이즈 2~3개 추출.
 * 각 프레이즈는 최대 80자로 제한.
 */
export const extractKeyPhrases = (
  rawText: string | null | undefined,
  sentiment?: string,
  limit = 3
): string[] => {
  if (!rawText) return [];
  const masked = maskPII(rawText);
  if (!masked || masked.length < 8) return [];

  const sentences = masked
    .split(/(?<=[.!?。！？])\s+|[\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 160);

  const signalSet = sentiment === "negative" ? NEGATIVE_SIGNALS : POSITIVE_SIGNALS;
  const fallbackSet = sentiment === "negative" ? POSITIVE_SIGNALS : NEGATIVE_SIGNALS;

  const score = (sent: string, signals: string[]) => {
    const lower = sent.toLowerCase();
    return signals.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);
  };

  const ranked = sentences
    .map((s) => ({
      sent: s,
      score: score(s, signalSet) * 2 + score(s, fallbackSet),
      len: s.length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.len - b.len);

  const picks: string[] = [];
  const seen = new Set<string>();
  for (const r of ranked) {
    const key = r.sent.toLowerCase().slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    const trimmed = r.sent.length > 90 ? r.sent.slice(0, 87).trim() + "…" : r.sent;
    picks.push(trimmed);
    if (picks.length >= limit) break;
  }

  // Fallback: 시그널이 없으면 가장 짧은 첫 문장 1개
  if (picks.length === 0 && sentences.length > 0) {
    const first = sentences.sort((a, b) => a.length - b.length)[0];
    picks.push(first.length > 90 ? first.slice(0, 87) + "…" : first);
  }

  return picks;
};
