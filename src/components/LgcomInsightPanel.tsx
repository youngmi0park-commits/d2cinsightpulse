import { getPrivacySafeThemeLabels } from "@/lib/reviewUtils";
import type { SentimentResult, SentimentSignal } from "@/lib/sentiment";

/* ── Types ── */
interface Props {
  sentiment: SentimentResult;
  productName: string;
  reviews: { source?: string; rating?: number; sentiment?: string; pros?: string[]; cons?: string[] }[];
}

/* ── Helpers ── */
function getRatingDistribution(reviews: { rating?: number }[]) {
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratedCount = 0;
  for (const r of reviews) {
    if (r.rating && r.rating >= 1 && r.rating <= 5) {
      dist[r.rating]++;
      ratedCount++;
    }
  }
  return { dist, ratedCount };
}

function getProConsTags(reviews: { pros?: string[]; cons?: string[] }[]) {
  const prosMap = new Map<string, number>();
  const consMap = new Map<string, number>();
  for (const r of reviews) {
    for (const p of r.pros || []) {
      const key = p.trim();
      if (key) prosMap.set(key, (prosMap.get(key) || 0) + 1);
    }
    for (const c of r.cons || []) {
      const key = c.trim();
      if (key) consMap.set(key, (consMap.get(key) || 0) + 1);
    }
  }
  const sortDesc = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return { pros: sortDesc(prosMap), cons: sortDesc(consMap) };
}

function groupSignalsByCategory(signals: SentimentSignal[]) {
  const map = new Map<string, { positive: number; negative: number; mixed: number }>();
  for (const sig of signals) {
    const cat = sig.category || "General";
    if (!map.has(cat)) map.set(cat, { positive: 0, negative: 0, mixed: 0 });
    const bucket = map.get(cat)!;
    if (sig.sentiment === "positive") bucket.positive++;
    else if (sig.sentiment === "negative") bucket.negative++;
    else bucket.mixed++;
  }
  return [...map.entries()]
    .sort(([, a], [, b]) => (b.positive + b.negative + b.mixed) - (a.positive + a.negative + a.mixed));
}

/* ── Component ── */
export function LgcomInsightPanel({ sentiment, productName, reviews }: Props) {
  const total = Math.max(sentiment.positive + sentiment.negative + sentiment.neutral, 1);
  const positivePct = Math.round((sentiment.positive / total) * 100);
  const negativePct = Math.round((sentiment.negative / total) * 100);
  const neutralPct = Math.round((sentiment.neutral / total) * 100);

  const positiveThemes = getPrivacySafeThemeLabels(sentiment.keywords.positive, 5);
  const negativeThemes = getPrivacySafeThemeLabels(sentiment.keywords.negative, 5);

  const { dist, ratedCount } = getRatingDistribution(reviews);
  const avgRating = ratedCount > 0
    ? (Object.entries(dist).reduce((s, [k, v]) => s + Number(k) * v, 0) / ratedCount).toFixed(1)
    : null;

  const { pros, cons } = getProConsTags(reviews);
  const topicBreakdown = groupSignalsByCategory(sentiment.signals);
  

  return (
    <div className="gradient-card rounded-xl border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold font-heading">🔑 LG.com 리뷰 인사이트</h3>
        <span className="text-[10px] text-muted-foreground">2차 가공 · 원문 비공개</span>
      </div>

      {/* ① Sentiment bar + rating */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
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
          <p className="text-[9px] text-muted-foreground text-center">
            총 {total.toLocaleString()}건 감성 분석 · 감성 점수 {sentiment.compositeScore}/100
          </p>
        </div>

        {/* Star rating distribution */}
        {ratedCount > 0 && (
          <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-border/60 bg-muted/20 min-w-[120px]">
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-foreground">{avgRating}</span>
              <span className="text-amber-500">★</span>
            </div>
            <div className="space-y-0.5 w-full">
              {[5, 4, 3, 2, 1].map((star) => {
                const pct = ratedCount > 0 ? Math.round((dist[star] / ratedCount) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-1 text-[9px]">
                    <span className="w-3 text-right text-muted-foreground">{star}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{dist[star]}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[8px] text-muted-foreground">{ratedCount}건 평점 보유</p>
          </div>
        )}
      </div>

      {/* ② 긍정/부정 키워드 — 빈도 기반 Pros/Cons 태그 우선, 없으면 테마 라벨 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Positive */}
        <div className="rounded-lg border border-[hsl(var(--success)/0.2)] bg-[hsl(var(--success)/0.05)] p-3 space-y-2">
          <p className="text-[10px] font-semibold text-[hsl(var(--success))]">✅ 긍정 키워드</p>
          {pros.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {pros.map(([tag, count]) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[10px] border bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)] flex items-center gap-1"
                >
                  {tag}
                  <span className="text-[8px] opacity-60">({count})</span>
                </span>
              ))}
            </div>
          ) : positiveThemes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {positiveThemes.map((theme) => (
                <span
                  key={theme}
                  className="px-2 py-0.5 rounded-full text-[10px] border bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]"
                >
                  {theme}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">데이터 부족</span>
          )}
        </div>

        {/* Negative */}
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-destructive">⚠️ 부정 키워드</p>
          {cons.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {cons.map(([tag, count]) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[10px] border bg-destructive/10 text-destructive border-destructive/20 flex items-center gap-1"
                >
                  {tag}
                  <span className="text-[8px] opacity-60">({count})</span>
                </span>
              ))}
            </div>
          ) : negativeThemes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {negativeThemes.map((theme) => (
                <span
                  key={theme}
                  className="px-2 py-0.5 rounded-full text-[10px] border bg-destructive/10 text-destructive border-destructive/20"
                >
                  {theme}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">데이터 부족</span>
          )}
        </div>
      </div>

      {/* ③ Topic-level sentiment breakdown */}
      {topicBreakdown.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground">📊 주제별 감성 분포</p>
          <div className="space-y-1.5">
            {topicBreakdown.slice(0, 6).map(([category, counts]) => {
              const catTotal = counts.positive + counts.negative + counts.mixed;
              const posPct = Math.round((counts.positive / catTotal) * 100);
              const negPct = Math.round((counts.negative / catTotal) * 100);
              return (
                <div key={category} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-foreground">{category}</span>
                    <div className="flex items-center gap-2 text-[9px]">
                      <span className="text-[hsl(var(--success))]">👍 {counts.positive}</span>
                      {counts.mixed > 0 && <span className="text-muted-foreground">➖ {counts.mixed}</span>}
                      <span className="text-destructive">👎 {counts.negative}</span>
                    </div>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                    <div className="h-full bg-[hsl(var(--success))]" style={{ width: `${posPct}%` }} />
                    <div className="h-full bg-destructive" style={{ width: `${negPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ④ 마케팅 액션 힌트 */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 px-3 py-2.5 space-y-1">
        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">🎯 마케팅 액션</p>
        <p className="text-[11px] text-foreground/90 leading-relaxed">
          {positivePct >= 70
            ? "긍정 비율이 높음. UGC 활용 및 소셜 확산 전략 추천."
            : negativePct >= 40
              ? "부정 비율 주의. 주요 불만 키워드 기반 개선 커뮤니케이션 필요."
              : "긍정과 부정이 혼재. 긍정 포인트 강화 + 부정 이슈 선제 대응 추천."}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span>{productName} · LG.com {total.toLocaleString()}건 · 개인정보 보호 정책 준수</span>
      </div>
    </div>
  );
}
