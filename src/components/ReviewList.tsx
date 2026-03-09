import type { Review } from "@/data/dummyData";
import { MessageSquare, Star } from "lucide-react";

interface ReviewListProps {
  reviews: Review[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  const sentimentStyle = (s?: string) => {
    if (s === "positive") return "border-success/30 bg-success/5";
    if (s === "negative") return "border-destructive/30 bg-destructive/5";
    return "border-border bg-secondary/30";
  };

  const sentimentBadge = (s?: string) => {
    if (s === "positive") return <span className="px-2 py-0.5 rounded-full text-xs bg-success/20 text-success">긍정</span>;
    if (s === "negative") return <span className="px-2 py-0.5 rounded-full text-xs bg-destructive/20 text-destructive">부정</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">중립</span>;
  };

  return (
    <div className="gradient-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 font-heading">수집된 리뷰 ({reviews.length}건)</h3>
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {reviews.map((review) => (
          <div
            key={review.id}
            className={`p-4 rounded-lg border transition-all hover:scale-[1.01] ${sentimentStyle(review.sentiment)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${sourceStyle(review.source)}`}>
                  {sourceLabel(review.source)}
                </span>
                <span className="text-sm text-muted-foreground">{review.author}</span>
              </div>
              <div className="flex items-center gap-2">
                {review.rating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < review.rating! ? "text-warning fill-warning" : "text-muted"}`} />
                    ))}
                  </div>
                )}
                {sentimentBadge(review.sentiment)}
              </div>
            </div>
            <p className="text-sm leading-relaxed">{review.text}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{review.date}</span>
              {review.score !== undefined && (
                <span className="text-xs font-mono text-muted-foreground">점수: {(review.score * 100).toFixed(0)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
