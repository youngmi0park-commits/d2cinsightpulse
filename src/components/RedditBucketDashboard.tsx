import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { countryToSourceFilter } from "@/components/CountryFilterBar";
import { maskCompetitorNames } from "@/lib/sentiment";
import { classifyRedditPost, generateBucketSummaries, type RedditBucket, type ClassifiedPost, type BucketSummary } from "@/lib/redditBucketClassifier";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, ChevronDown, Copy, TrendingUp, AlertTriangle, HelpCircle, Hash, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function useRedditClassified(country: string) {
  const sourcesFilter = country !== "all" ? countryToSourceFilter(country) : null;
  return useQuery({
    queryKey: ["reddit-classified", country],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("id, content, title, sentiment, sentiment_score, source")
        .like("source", "reddit%")
        .order("collected_at", { ascending: false })
        .limit(500);
      if (sourcesFilter) {
        const redditSources = sourcesFilter.filter(s => s.startsWith("reddit"));
        if (redditSources.length === 0) return [];
        query = query.in("source", redditSources);
      }
      const { data, error } = await query;
      if (error) throw error;
      const classified = (data || []).map(classifyRedditPost);
      return generateBucketSummaries(classified);
    },
    staleTime: 1000 * 60 * 15,
  });
}

const BUCKET_STYLES: Record<RedditBucket, { bg: string; border: string; text: string; icon: React.ElementType; badgeBg: string }> = {
  REVIEW: { bg: "bg-success/5", border: "border-success/15", text: "text-success", icon: TrendingUp, badgeBg: "bg-success/10" },
  VOC: { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400", icon: AlertTriangle, badgeBg: "bg-red-500/10" },
  QUESTION: { bg: "bg-blue-500/5", border: "border-blue-500/20", text: "text-blue-400", icon: HelpCircle, badgeBg: "bg-blue-500/10" },
};

function BucketCard({ summary, t }: { summary: BucketSummary; t: (en: string, ko: string) => string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const style = BUCKET_STYLES[summary.bucket];
  const Icon = style.icon;

  const displayPosts = showAll ? summary.posts : summary.posts.slice(0, 5);

  const handleCopyKeywords = () => {
    const text = summary.topKeywords.map((kw) => `${kw.word} (${kw.count})`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success(t("Keywords copied!", "키워드 복사 완료!"));
  };

  const handleCopyPosts = () => {
    const text = summary.posts
      .slice(0, 20)
      .map((p) => `[${p.bucket}] ${p.title || ""}\n${p.content.slice(0, 200)}...\nKeywords: ${p.keywords.join(", ")}\nActions: ${p.actionTags.join(", ")}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success(t("Posts copied!", "포스트 복사 완료!"));
  };

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${style.text}`} />
          <h4 className={`font-semibold text-sm ${style.text}`}>
            {summary.icon} {t(summary.label, summary.labelKo)}
          </h4>
          <Badge variant="secondary" className={`text-[10px] ${style.badgeBg} ${style.text}`}>
            {summary.count}{t(" posts", "건")}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleCopyKeywords}>
            <Hash className="h-3 w-3 mr-1" />
            {t("Copy Keywords", "키워드 복사")}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleCopyPosts}>
            <Copy className="h-3 w-3 mr-1" />
            {t("Copy All", "전체 복사")}
          </Button>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-muted-foreground mb-3">
        {t(summary.description, summary.descriptionKo)}
      </p>

      {/* Action Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {summary.actions.map((action) => (
          <Badge
            key={action.label}
            variant="outline"
            className={`text-[10px] px-2 py-0.5 ${style.border} ${style.text} gap-1`}
          >
            <span>{action.icon}</span>
            <ArrowRight className="h-2.5 w-2.5" />
            {t(action.label, action.labelKo)}
          </Badge>
        ))}
      </div>

      {/* Top Keywords */}
      {summary.topKeywords.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] font-medium text-muted-foreground block mb-1.5">
            {t("Top Keywords", "상위 키워드")}
          </span>
          <div className="flex flex-wrap gap-1">
            {summary.topKeywords.map((kw) => (
              <Badge key={kw.word} variant="secondary" className="text-[9px] px-1.5 py-0">
                {kw.word} <span className="text-muted-foreground ml-0.5">({kw.count})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Posts List */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <span>{t("View classified posts", "분류된 포스트 보기")}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 mt-2">
            {displayPosts.map((post) => (
              <PostItem key={post.id} post={post} style={style} t={t} />
            ))}
            {summary.posts.length > 5 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-[11px] text-primary hover:underline"
              >
                {t(`Show all ${summary.posts.length} posts`, `전체 ${summary.posts.length}건 보기`)}
              </button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function PostItem({
  post,
  style,
  t,
}: {
  post: ClassifiedPost;
  style: typeof BUCKET_STYLES.REVIEW;
  t: (en: string, ko: string) => string;
}) {
  return (
    <div className="rounded-md bg-background/50 border border-border/50 p-2.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[11px] font-medium text-foreground line-clamp-1">
          {maskCompetitorNames(post.title || post.content.slice(0, 60) + "…")}
        </span>
        <Badge variant="outline" className={`text-[9px] shrink-0 ${style.text} ${style.border}`}>
          {(post.bucketConfidence * 100).toFixed(0)}%
        </Badge>
      </div>
      <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">
        {maskCompetitorNames(post.content.slice(0, 150))}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" className="text-[9px] px-1 py-0">
          {post.sentiment || "neutral"}
        </Badge>
        {post.actionTags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 border-muted">
            {tag.replace(/_/g, " ")}
          </Badge>
        ))}
        <span className="text-[9px] text-muted-foreground ml-auto">{post.source}</span>
      </div>
    </div>
  );
}

export function RedditBucketDashboard({ country = "all" }: { country?: string }) {
  const { t } = useLang();
  const { data: summaries, isLoading } = useRedditClassified(country);

  const totalPosts = summaries?.reduce((s, b) => s + b.count, 0) || 0;

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-heading">
              {t("Reddit Data Auto-Classification", "Reddit 데이터 자동 분류")}
            </CardTitle>
            {totalPosts > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {totalPosts}{t(" posts analyzed", "건 분석")}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "Auto-classifies Reddit posts into REVIEW / VOC / QUESTION buckets with marketing actions",
            "Reddit 포스트를 리뷰 / VOC / 질문으로 자동 분류하고 마케팅 액션을 연결합니다"
          )}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t("Classifying Reddit data...", "Reddit 데이터 분류 중...")}
          </div>
        ) : !summaries || totalPosts === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("No Reddit data available. Collect Reddit reviews first.", "Reddit 데이터가 없습니다. 먼저 Reddit 리뷰를 수집하세요.")}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex gap-2">
              {summaries.map((s) => {
                const pct = totalPosts > 0 ? ((s.count / totalPosts) * 100).toFixed(0) : "0";
                const style = BUCKET_STYLES[s.bucket];
                return (
                  <div key={s.bucket} className={`flex-1 rounded-lg ${style.bg} ${style.border} border p-2.5 text-center`}>
                    <div className={`text-lg font-bold ${style.text}`}>{s.count}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.icon} {t(s.label, s.labelKo)} ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bucket cards — horizontal 3-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summaries.map((s) => (
                <BucketCard key={s.bucket} summary={s} t={t} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
