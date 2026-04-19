import { Badge } from "@/components/ui/badge";
import { Calendar, AlertTriangle } from "lucide-react";
import { useTrendingDataWindow } from "@/hooks/useProductData";

interface Props {
  /** Optional source LIKE filter, e.g. "lge_com%" or "reddit%". Omit for global. */
  sourceLike?: string;
  className?: string;
}

/**
 * Unified data-window badge for "이번 주 작성 리뷰" 기준.
 * Shows 7d window normally, switches to 30d fallback when weekly < 30 reviews.
 */
export function DataWindowBadge({ sourceLike, className }: Props) {
  const { data } = useTrendingDataWindow(sourceLike);
  if (!data) return null;

  const todayStr = new Date().toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

  if (data.isFallback) {
    return (
      <Badge
        variant="outline"
        className={`text-[10px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5 ${className || ""}`}
        title="주간 리뷰가 30건 미만이라 최근 30일 작성 리뷰까지 포함합니다."
      >
        <AlertTriangle className="h-3 w-3" />
        1개월 폴백 · 이번 주 작성 {data.weeklyCount}건
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`text-[10px] gap-1 border-primary/30 text-primary bg-primary/5 ${className || ""}`}
      title="이번 주(최근 7일) 내 작성된 리뷰 기준 분석"
    >
      <Calendar className="h-3 w-3" />
      {todayStr} · 이번 주 작성 {data.weeklyCount}건
    </Badge>
  );
}
