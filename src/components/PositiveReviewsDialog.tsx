import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, ThumbsUp, Star } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  category?: string;
  sourceLike: string; // e.g. "lge_com%" | "reddit%"
  sinceISO?: string;
}

export function PositiveReviewsDialog({
  open, onOpenChange, productName, category, sourceLike, sinceISO,
}: Props) {
  const { t } = useLang();

  const { data, isLoading } = useQuery({
    queryKey: ["positive-reviews-detail", productName, sourceLike, sinceISO],
    enabled: open && !!productName,
    queryFn: async () => {
      let q = supabase
        .from("reviews")
        .select("id, title, content, rating, sentiment_score, source, published_at, collected_at, products!inner(display_name, category)")
        .like("source", sourceLike)
        .eq("sentiment", "positive")
        .eq("products.display_name", productName)
        .order("collected_at", { ascending: false })
        .limit(200);
      if (sinceISO) q = q.gte("collected_at", sinceISO);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ThumbsUp className="h-4 w-4 text-success" />
            {productName}
            {category && <Badge variant="outline" className="text-[10px]">{category}</Badge>}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("All positive reviews within the active window", "활성 윈도우 내 모든 긍정 리뷰")}
            {data && ` · ${data.length}${t(" reviews", "건")}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t("Loading...", "로딩 중...")}</span>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t("No reviews found.", "표시할 리뷰가 없습니다.")}
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-3">
            <div className="space-y-2">
              {data.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-success/15 bg-success/5 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {r.rating != null && (
                      <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                        <Star className="h-3 w-3 fill-current" />{r.rating}
                      </span>
                    )}
                    <span className="truncate">{r.source}</span>
                    {r.published_at && (
                      <span className="ml-auto">{new Date(r.published_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {r.title && <div className="text-xs font-semibold text-foreground">{r.title}</div>}
                  {r.content && (
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {r.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}