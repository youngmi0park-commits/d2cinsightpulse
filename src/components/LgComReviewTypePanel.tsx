import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCheck, Share2, BarChart3 } from "lucide-react";

type ReviewTypeKey = "native" | "syndication";

interface TypeStats {
  total: number;
  native: number;
  syndication: number;
  byCountry: Record<string, { native: number; syndication: number; total: number }>;
  weeklyNative: number;
  weeklySyndication: number;
}

export function LgComReviewTypePanel() {
  const { t } = useLang();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["lgcom-review-type-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, source, review_type, collected_at")
        .like("source", "lge_com%")
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const stats = useMemo<TypeStats | null>(() => {
    if (!reviews || reviews.length === 0) return null;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let native = 0;
    let syndication = 0;
    let weeklyNative = 0;
    let weeklySyndication = 0;
    const byCountry: Record<string, { native: number; syndication: number; total: number }> = {};

    for (const r of reviews) {
      const tag = (r.review_type || "").toLowerCase();
      const isSyndication = tag.includes("originally posted from");
      const country = r.source === "lge_com_us" ? "US" : r.source === "lge_com_uk" ? "UK" : "Other";
      const isWeekly = new Date(r.collected_at) >= weekAgo;

      if (isSyndication) {
        syndication++;
        if (isWeekly) weeklySyndication++;
      } else {
        native++;
        if (isWeekly) weeklyNative++;
      }

      if (!byCountry[country]) byCountry[country] = { native: 0, syndication: 0, total: 0 };
      byCountry[country].total++;
      if (isSyndication) byCountry[country].syndication++;
      else byCountry[country].native++;
    }

    return { total: reviews.length, native, syndication, byCountry, weeklyNative, weeklySyndication };
  }, [reviews]);

  if (isLoading) {
    return (
      <Card className="gradient-card">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const nativePct = stats.total > 0 ? Math.round((stats.native / stats.total) * 100) : 0;
  const synPct = 100 - nativePct;

  const FLAG: Record<string, string> = { US: "🇺🇸", UK: "🇬🇧", Other: "🌐" };

  return (
    <Card className="gradient-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          📋 {t("Review Type Analysis", "리뷰 유형 분석")}
          <Badge variant="outline" className="ml-auto text-[10px]">
            {t("Native vs Syndication", "자사몰 vs 신디케이션")}
          </Badge>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          {t(
            "Classifies reviews by origin: Native (direct LG.com) vs Syndication (tagged as 'original' from external sources)",
            "리뷰 원본 출처를 분류합니다 — Native: LG.com 직접 작성 | Syndication: 외부 채널에서 유입된 리뷰 (review_type에 'original' 태그 포함)"
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary rounded-l-full flex items-center justify-center transition-all"
              style={{ width: `${nativePct}%` }}
            >
              {nativePct > 15 && (
                <span className="text-[10px] font-bold text-primary-foreground">
                  Native {nativePct}%
                </span>
              )}
            </div>
            <div
              className="h-full bg-amber-500 rounded-r-full flex items-center justify-center transition-all"
              style={{ width: `${synPct}%` }}
            >
              {synPct > 15 && (
                <span className="text-[10px] font-bold text-white">
                  Syndication {synPct}%
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium shrink-0">
            {t("Total", "전체")} {stats.total.toLocaleString()}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Native */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <FileCheck className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground">{stats.native.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Native</div>
            <div className="text-[10px] text-primary font-semibold mt-0.5">
              {t("This week", "주간")} +{stats.weeklyNative}
            </div>
          </div>

          {/* Syndication */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <Share2 className="h-4 w-4 text-amber-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground">{stats.syndication.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Syndication</div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
              {t("This week", "주간")} +{stats.weeklySyndication}
            </div>
          </div>

          {/* By country */}
          {Object.entries(stats.byCountry)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([country, c]) => {
              const cNativePct = c.total > 0 ? Math.round((c.native / c.total) * 100) : 0;
              return (
                <div key={country} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm">{FLAG[country] || "🌐"}</span>
                    <span className="text-xs font-bold text-foreground">{country}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{c.total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 h-3 bg-muted/30 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-primary rounded-l-full" style={{ width: `${cNativePct}%` }} />
                    <div className="h-full bg-amber-500 rounded-r-full" style={{ width: `${100 - cNativePct}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>Native {c.native.toLocaleString()}</span>
                    <span>Syn. {c.syndication.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Insight note */}
        <div className="rounded-lg bg-muted/30 border border-border p-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            💡 <strong className="text-foreground">{t("Classification Rule", "분류 기준")}</strong>:{" "}
            {t(
              "Reviews with no review_type tag → Native (direct LG.com). Reviews with 'original' in review_type tag → Syndication (sourced from external platforms).",
              "review_type 태그가 없는 리뷰 → Native (LG.com 직접 작성). review_type에 'original'이 포함된 리뷰 → Syndication (외부 플랫폼 유입)."
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
