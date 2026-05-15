/**
 * 리뷰 전략 대상 12개국 (Review Strategic Countries).
 * UI 전반에서 국가 라벨 옆에 작은 배지로 표시한다.
 */
// 정렬 순서: 북미 → 유럽 → 중남미 → 아시아(오세아니아) → 중동·아프리카
export const STRATEGIC_COUNTRIES = [
  // 북미
  "US", "CA",
  // 유럽
  "UK", "DE", "ES",
  // 중남미
  "BR", "MX", "PE",
  // 아시아·오세아니아
  "AU", "TH", "VN",
  // 중동·아프리카
  "SA",
] as const;

export type StrategicCountryISO = (typeof STRATEGIC_COUNTRIES)[number];

export function isStrategicCountry(iso?: string | null): boolean {
  if (!iso) return false;
  return (STRATEGIC_COUNTRIES as readonly string[]).includes(iso.toUpperCase());
}
