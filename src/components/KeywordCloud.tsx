import type { SentimentResult } from "@/lib/sentiment";
import { useLang } from "@/contexts/LanguageContext";

interface KeywordCloudProps {
  keywords: SentimentResult["keywords"];
}

export function KeywordCloud({ keywords }: KeywordCloudProps) {
  const { t } = useLang();

  const posCount = keywords.positive.length;
  const negCount = keywords.negative.length;
  const isHighlight = posCount >= 10 && posCount > negCount;
  const isNegHighlight = negCount >= 10 && negCount > posCount;

  return (
    <div className="gradient-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 font-heading">{t("Keyword Extraction", "키워드 추출")}</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-success font-medium mb-2">
            {t("Positive Keywords", "긍정 키워드")}
            {isHighlight && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-success/20 text-success animate-pulse">
                🔥 {posCount}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {posCount > 0 ? keywords.positive.map((kw) => (
              <span
                key={kw}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  isHighlight
                    ? "bg-success/25 text-success font-semibold border-success/40 shadow-[0_0_8px_hsl(var(--success)/0.3)]"
                    : "bg-success/15 text-success border-success/20 hover:bg-success/25"
                }`}
              >
                {kw}
              </span>
            )) : <span className="text-sm text-muted-foreground">{t("No data", "데이터 없음")}</span>}
          </div>
        </div>
        <div>
          <p className="text-sm text-destructive font-medium mb-2">{t("Negative Keywords", "부정 키워드")}</p>
          <div className="flex flex-wrap gap-2">
            {negCount > 0 ? keywords.negative.map((kw) => (
              <span key={kw} className="px-3 py-1.5 rounded-full text-sm bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive/25 transition-colors">
                {kw}
              </span>
            )) : <span className="text-sm text-muted-foreground">{t("No data", "데이터 없음")}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
