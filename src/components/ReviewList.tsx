import { useState } from "react";
import { maskCompetitorNames } from "@/lib/sentiment";
import type { Review } from "@/data/dummyData";
import { Star, Calendar, TrendingUp, Languages, Loader2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { subDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ReviewListProps {
  reviews: Review[];
}

const sourceLabel = (s: string) => {
  const map: Record<string, string> = {
    lge_com: "LG.com",
    reddit: "Reddit", amazon: "Amazon", rtings: "RTINGS",
    trusted_reviews: "Trusted Reviews", consumer_reports: "Consumer Reports",
    cnet: "CNET", trustpilot: "Trustpilot", bestreviews: "BestReviews",
  };
  return map[s] || s;
};

const sourceStyle = (s: string) => {
  const map: Record<string, string> = {
    lge_com: "bg-primary/20 text-primary",
    reddit: "bg-accent/20 text-accent",
    amazon: "bg-warning/20 text-warning",
    rtings: "bg-blue-500/20 text-blue-400",
    trusted_reviews: "bg-success/20 text-success",
    consumer_reports: "bg-red-500/20 text-red-400",
    cnet: "bg-rose-500/20 text-rose-400",
    trustpilot: "bg-green-500/20 text-green-400",
    bestreviews: "bg-violet-500/20 text-violet-400",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

function ReviewCard({ review, t }: { review: Review; t: (en: string, ko: string) => string }) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = async () => {
    if (translated) {
      setShowTranslation(!showTranslation);
      return;
    }

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-review", {
        body: { text: review.text },
      });

      if (error) throw error;

      if (data?.translated) {
        setTranslated(data.translated);
        setShowTranslation(true);
      } else {
        throw new Error("Translation failed");
      }
    } catch (e) {
      console.error("Translation error:", e);
      toast({
        title: t("Translation failed", "번역 실패"),
        description: t("Please try again later.", "나중에 다시 시도해 주세요."),
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const sentimentStyle = (s?: string) => {
    if (s === "positive") return "border-success/30 bg-success/5";
    if (s === "negative") return "border-destructive/30 bg-destructive/5";
    return "border-border bg-secondary/30";
  };

  const sentimentBadge = (s?: string) => {
    if (s === "positive") return <span className="px-2 py-0.5 rounded-full text-xs bg-success/20 text-success">{t("Positive", "긍정")}</span>;
    if (s === "negative") return <span className="px-2 py-0.5 rounded-full text-xs bg-destructive/20 text-destructive">{t("Negative", "부정")}</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{t("Neutral", "중립")}</span>;
  };

  return (
    <div className={`p-4 rounded-lg border transition-all hover:scale-[1.01] ${sentimentStyle(review.sentiment)}`}>
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

      <p className={`text-sm leading-relaxed ${review.source === "lge_com" ? "italic text-muted-foreground" : ""}`}>{maskCompetitorNames(review.text)}</p>

      {showTranslation && translated && (
        <div className="mt-2 p-3 rounded-md bg-primary/5 border border-primary/20">
          <p className="text-sm leading-relaxed text-foreground/90">
            <span className="text-xs font-semibold text-primary mr-1.5">🇰🇷</span>
            {translated}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{review.date}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTranslate}
            disabled={isTranslating}
            className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-primary"
          >
            {isTranslating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Languages className="h-3 w-3" />
            )}
            {showTranslation
              ? t("Hide translation", "번역 숨기기")
              : translated
                ? t("Show translation", "번역 보기")
                : t("Translate to Korean", "국문 번역")}
          </Button>
        </div>
        {review.score !== undefined && (
          <span className="text-xs font-mono text-muted-foreground">{t("Score", "점수")}: {(review.score * 100).toFixed(0)}</span>
        )}
      </div>
    </div>
  );
}

export function ReviewList({ reviews }: ReviewListProps) {
  const { t } = useLang();

  // LG.com 리뷰 원문은 노출하지 않음 — 분석 전용
  const filteredReviews = reviews.filter((r) => !r.source.startsWith("lge_com"));
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const weekLabel = `${format(weekAgo, "MM.dd")} ~ ${format(now, "MM.dd")}`;

  const weeklyReviews = filteredReviews.filter((r) => {
    if (!r.date) return false;
    const d = new Date(r.date);
    return d >= weekAgo;
  });

  const olderReviews = filteredReviews.filter((r) => {
    if (!r.date) return true;
    const d = new Date(r.date);
    return d < weekAgo;
  });

  return (
    <div className="gradient-card rounded-xl border border-border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold font-heading">
          {t(`Real Customer Reviews (${filteredReviews.length})`, `실고객 리뷰 (${filteredReviews.length}건)`)}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t("Discover real user reviews of LG Electronics products.", "고객들의 생생한 LG전자 제품 사용 후기를 만나보세요.")}
        </p>
      </div>

      {/* Weekly Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-bold text-primary">
            {t(`Weekly Reviews (${weekLabel})`, `주간 리뷰 (${weekLabel})`)}
          </h4>
          <Badge variant="secondary" className="text-xs">
            {weeklyReviews.length}{t(" reviews", "건")}
          </Badge>
        </div>
        {weeklyReviews.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {weeklyReviews.map((review) => (
              <ReviewCard key={review.id} review={review} t={t} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
            {t("No reviews collected in the last 7 days.", "최근 7일간 수집된 리뷰가 없습니다.")}
          </p>
        )}
      </div>

      {/* Cumulative Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-bold text-muted-foreground">
            {t("Cumulative (12 months)", "누적 (12개월)")}
          </h4>
          <Badge variant="outline" className="text-xs">
            {olderReviews.length}{t(" reviews", "건")}
          </Badge>
        </div>
        {olderReviews.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {olderReviews.map((review) => (
              <ReviewCard key={review.id} review={review} t={t} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
            {t("No older reviews collected.", "이전 기간 수집 리뷰가 없습니다.")}
          </p>
        )}
      </div>
    </div>
  );
}
