import { Badge } from "@/components/ui/badge";
import { getPrivacySafeThemeLabels } from "@/lib/reviewUtils";

interface Props {
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  positiveCount: number;
  negativeCount: number;
  total: number;
  score: number;
  positiveKeywords: string[];
  negativeKeywords: string[];
  dominantIssueCategory: string;
  productName: string;
}

export function LgcomReviewSummary({
  positivePct,
  negativePct,
  neutralPct,
  positiveCount,
  negativeCount,
  total,
  score,
  positiveKeywords,
  negativeKeywords,
  dominantIssueCategory,
  productName,
}: Props) {
  const positiveThemes = getPrivacySafeThemeLabels(positiveKeywords, 4);
  const negativeThemes = getPrivacySafeThemeLabels(negativeKeywords, 4);

  const overallSummary =
    positivePct > negativePct
      ? "전반적으로 긍정 반응이 우세합니다."
      : negativePct > positivePct
        ? "개선 요청 비중이 상대적으로 높습니다."
        : "긍정과 개선 의견이 혼재합니다.";

  return (
    <div className="space-y-4 p-4 rounded-xl border border-primary/15 bg-primary/5">
      <div className="flex items-start gap-2.5">
        <span className="text-base">🔒</span>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground">LG.com 리뷰 데이터 정책</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            개인정보 보호 정책에 따라 원문은 비공개되며, 아래 내용은 2차 가공된 요약·테마 중심 인사이트입니다.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/70 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-foreground">📌 핵심 요약</p>
          {dominantIssueCategory !== "General" && (
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
              주요 이슈: {dominantIssueCategory}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-foreground/90 leading-relaxed">{overallSummary}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-medium">
          <span className="text-[hsl(var(--success))]">긍정 {positivePct}%</span>
          <span className="text-muted-foreground">중립 {neutralPct}%</span>
          <span className="text-destructive">부정 {negativePct}%</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
          <div className="h-full bg-[hsl(var(--success))]" style={{ width: `${positivePct}%` }} />
          <div className="h-full bg-muted-foreground/40" style={{ width: `${neutralPct}%` }} />
          <div className="h-full bg-destructive" style={{ width: `${negativePct}%` }} />
        </div>
        <p className="text-[9px] text-muted-foreground text-center">{total.toLocaleString()}건 감성 기반 분석</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)]">
          <p className="text-sm font-bold text-[hsl(var(--success))]">{positiveCount.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">긍정 리뷰</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-bold text-primary">{score}</p>
          <p className="text-[9px] text-muted-foreground">감성 점수</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm font-bold text-destructive">{negativeCount.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">부정 리뷰</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/60 bg-background/70 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-[hsl(var(--success))]">👍 주요 만족 테마</p>
          <div className="flex flex-wrap gap-1.5">
            {positiveThemes.length > 0 ? (
              positiveThemes.map((theme) => (
                <Badge key={theme} variant="secondary" className="text-[9px] bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]">
                  {theme}
                </Badge>
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground">요약 가능한 테마가 아직 부족합니다.</span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/70 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-destructive">👎 주요 개선 테마</p>
          <div className="flex flex-wrap gap-1.5">
            {negativeThemes.length > 0 ? (
              negativeThemes.map((theme) => (
                <Badge key={theme} variant="secondary" className="text-[9px] bg-destructive/10 text-destructive">
                  {theme}
                </Badge>
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground">뚜렷한 부정 테마가 아직 적습니다.</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        {productName} · LG.com 2차 가공 감성 분석 (원문 비공개)
      </div>
    </div>
  );
}
