import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { classifyRedditPost, type ClassifiedPost } from "@/lib/redditBucketClassifier";
import { maskCompetitorNames } from "@/lib/sentiment";
import { countryToSourceFilter } from "@/components/CountryFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, MessageCircle, ExternalLink, ChevronDown, Filter, Languages } from "lucide-react";
import { toast } from "sonner";

function useRedditPosts(country: string) {
  const sourcesFilter = country !== "all" ? countryToSourceFilter(country) : null;
  return useQuery({
    queryKey: ["reddit-voc-posts", country],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("id, content, title, sentiment, sentiment_score, source, published_at, author, product_id, products!inner(display_name, category)")
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
      return (data || []).map((r) => ({
        ...classifyRedditPost(r),
        author: r.author,
        publishedAt: r.published_at,
        productName: (r.products as any)?.display_name || "Unknown",
        category: (r.products as any)?.category || "",
      }));
    },
    staleTime: 60_000 * 10,
  });
}

type BucketFilter = "ALL" | "REVIEW" | "VOC" | "QUESTION";

const BUCKET_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  REVIEW: { bg: "bg-success/10", text: "text-success", border: "border-success/20" },
  VOC: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
  QUESTION: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
};

const SENTIMENT_ICON: Record<string, React.ReactNode> = {
  positive: <ThumbsUp className="h-3 w-3 text-success" />,
  negative: <ThumbsDown className="h-3 w-3 text-destructive" />,
  neutral: <MessageCircle className="h-3 w-3 text-muted-foreground" />,
};

export function RedditVocPostCards({ country = "all" }: { country?: string }) {
  const { data: posts, isLoading } = useRedditPosts(country);
  const [filter, setFilter] = useState<BucketFilter>("ALL");
  const [showCount, setShowCount] = useState(12);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const handleTranslate = useCallback(async (id: string, content: string) => {
    if (translations[id]) return;
    setTranslating((prev) => ({ ...prev, [id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("translate-review", {
        body: { text: content },
      });
      if (error) throw error;
      setTranslations((prev) => ({ ...prev, [id]: data.translated }));
    } catch {
      toast.error("번역에 실패했습니다.");
    } finally {
      setTranslating((prev) => ({ ...prev, [id]: false }));
    }
  }, [translations]);

  const filtered = useMemo(() => {
    if (!posts) return [];
    return filter === "ALL" ? posts : posts.filter((p) => p.bucket === filter);
  }, [posts, filter]);

  const displayed = filtered.slice(0, showCount);
  const total = posts?.length || 0;
  const bucketCounts = useMemo(() => {
    if (!posts) return { REVIEW: 0, VOC: 0, QUESTION: 0 };
    return {
      REVIEW: posts.filter((p) => p.bucket === "REVIEW").length,
      VOC: posts.filter((p) => p.bucket === "VOC").length,
      QUESTION: posts.filter((p) => p.bucket === "QUESTION").length,
    };
  }, [posts]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("복사 완료!");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Reddit VOC 데이터 로딩 중...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Reddit VOC Post Cards</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{total}건</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Reddit에서 수집된 VOC를 카드 형태로 확인합니다. 버킷·감성·키워드·액션태그를 한눈에 파악하세요.
        </p>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 mt-3">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {(["ALL", "REVIEW", "VOC", "QUESTION"] as const).map((b) => (
            <button
              key={b}
              onClick={() => { setFilter(b); setShowCount(12); }}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                filter === b
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {b === "ALL" ? `전체 (${total})` : `${b} (${bucketCounts[b]})`}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayed.map((post) => {
            const style = BUCKET_COLORS[post.bucket];
            return (
              <div
                key={post.id}
                className={`rounded-lg border ${style.border} ${style.bg} p-3.5 space-y-2 hover:shadow-md transition-shadow`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className={`text-[9px] ${style.text} ${style.border}`}>
                    {post.bucket}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    {SENTIMENT_ICON[post.sentiment || "neutral"]}
                    <span className="text-[9px] text-muted-foreground">
                      {Math.round((post.bucketConfidence || 0) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Product */}
                <div className="text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">{(post as any).productName}</span>
                  {(post as any).category && (
                    <span className="ml-1.5 text-muted-foreground">· {(post as any).category}</span>
                  )}
                </div>

                {/* Title */}
                {post.title && (
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{maskCompetitorNames(post.title)}</p>
                )}

                {/* Content */}
                <p className="text-[11px] text-foreground/80 line-clamp-3 leading-relaxed">
                  {maskCompetitorNames(post.content)}
                </p>

                {/* Translation */}
                {translations[post.id] && (
                  <p className="text-[11px] text-primary/80 leading-relaxed bg-primary/5 rounded px-2 py-1">
                    🇰🇷 {translations[post.id]}
                  </p>
                )}

                {/* Keywords */}
                {post.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.keywords.slice(0, 4).map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-[8px] px-1 py-0">{kw}</Badge>
                    ))}
                  </div>
                )}

                {/* Action Tags */}
                {post.actionTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.actionTags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[8px] px-1 py-0 border-muted">
                        → {tag.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-[9px] text-muted-foreground">
                    {(post as any).author || "anonymous"} · {post.source}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[9px]"
                      disabled={translating[post.id]}
                      onClick={() => handleTranslate(post.id, post.content)}
                    >
                      <Languages className="h-2.5 w-2.5 mr-0.5" />
                      {translating[post.id] ? "..." : translations[post.id] ? "번역됨" : "번역"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px]" onClick={() => handleCopy(post.content)}>
                      <Copy className="h-2.5 w-2.5 mr-0.5" />복사
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length > showCount && (
          <button
            onClick={() => setShowCount((p) => p + 12)}
            className="w-full mt-4 py-2 text-xs text-primary hover:underline flex items-center justify-center gap-1"
          >
            <ChevronDown className="h-3 w-3" />
            더보기 ({filtered.length - showCount}건 남음)
          </button>
        )}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">해당 버킷의 데이터가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}
