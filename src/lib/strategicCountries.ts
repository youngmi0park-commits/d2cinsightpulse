/**
 * 리뷰 전략 대상 12개국 (Review Strategic Countries).
 * UI 전반에서 국가 라벨 옆에 작은 배지로 표시한다.
 */
export const STRATEGIC_COUNTRIES = [
  "US", "CA", "DE", "ES", "UK", "BR",
  "MX", "PE", "SA", "AU", "TH", "VN",
] as const;

export type StrategicCountryISO = (typeof STRATEGIC_COUNTRIES)[number];

export function isStrategicCountry(iso?: string | null): boolean {
  if (!iso) return false;
  return (STRATEGIC_COUNTRIES as readonly string[]).includes(iso.toUpperCase());
}
