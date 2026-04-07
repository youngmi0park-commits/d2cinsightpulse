import { Badge } from "@/components/ui/badge";

interface Props {
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  positiveCount: number;
  negativeCount: number;
  total: number;
  score: number;
  topKeywords: string[];
  productName: string;
}

export function LgcomReviewSummary({
  positivePct, negativePct, neutralPct,
  positiveCount, negativeCount, total,
  score, topKeywords, productName,
}: Props) {
  return (
    <div className="space-y-4 p-4 rounded-xl border border-primary/15 bg-primary/5">
      {/* Privacy notice */}
      <div className="flex items-start gap-2.5">
        <span className="text-base">🔒</span>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground">LG.com 리뷰 데이터 정책</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            개인정보 보호 정책에 따라 원문이 비공개됩니다.
            감성 분류 데이터를 기반으로 집계된 인사이트를 표시합니다.
          </p>
        </div>
      </div>

      {/* Sentiment bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-medium">
          <span className="text-[#006600]">긍정 {positivePct}%</span>
          <span className="text-amber-600">중립 {neutralPct}%</span>
          <span className="text-destructive">부정 {negativePct}%</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
          <div className="h-full bg-[#006600]" style={{ width: `${positivePct}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${neutralPct}%` }} />
          <div className="h-full bg-destructive" style={{ width: `${negativePct}%` }} />
        </div>
        <p className="text-[9px] text-muted-foreground text-center">
          {total.toLocaleString()}건 감성 기반 분석
        </p>
      </div>

      {/* Aggregated counts */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-[#006600]/10 border border-[#006600]/20">
          <p className="text-sm font-bold text-[#006600]">{positiveCount.toLocaleString()}</p>
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

      {/* Keywords */}
      {topKeywords.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground">🔑 연관 키워드</p>
          <div className="flex flex-wrap gap-1">
            {topKeywords.slice(0, 8).map((kw) => (
              <Badge key={kw} variant="secondary" className="text-[9px]">{kw}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Source note */}
      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        LG.com — 감성 분류 기반 분석 (원문 비공개)
      </div>
    </div>
  );
}
