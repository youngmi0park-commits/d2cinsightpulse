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
