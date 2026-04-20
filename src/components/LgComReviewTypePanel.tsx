import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileCheck, Share2, BarChart3, CalendarDays, Database } from "lucide-react";

interface CountryStats { native: number; syndication: number; total: number }

interface TypeStats {
  total: number;
  native: number;
  syndication: number;
  byCountry: Record<string, CountryStats>;
}

export function LgComReviewTypePanel() {
  const { t } = useLang();
  const [mode, setMode] = useState<"weekly" | "cumulative">("weekly");

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

  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const stats = useMemo<TypeStats | null>(() => {
    if (!reviews || reviews.length === 0) return null;

    let native = 0;
    let syndication = 0;
    const byCountry: Record<string, CountryStats> = {};

    for (const r of reviews) {
      if (mode === "weekly" && new Date(r.collected_at) < weekAgo) continue;

      const tag = (r.review_type || "").toLowerCase();
      const isSyndication = tag.includes("originally posted");
      const country = r.source === "lge_com_us" ? "US" : r.source === "lge_com_uk" ? "UK" : "Other";

      if (isSyndication) syndication++;
      else native++;

      if (!byCountry[country]) byCountry[country] = { native: 0, syndication: 0, total: 0 };
      byCountry[country].total++;
      if (isSyndication) byCountry[country].syndication++;
      else byCountry[country].native++;
    }

    return { total: native + syndication, native, syndication, byCountry };
  }, [reviews, mode, weekAgo]);

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
  const LGE: Record<string, string> = { US: "LGEUS", UK: "LGEUK", Other: "Other" };

  return (
    <Card className="gradient-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base flex-wrap">
          <BarChart3 className="h-4 w-4 text-primary" />
          📋 {t("Review Type Analysis", "리뷰 유형 분석")}

          {/* Weekly / Cumulative toggle */}
          <div className="flex gap-1 ml-auto">
            <Button
              size="sm"
              variant={mode === "weekly" ? "default" : "outline"}
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => setMode("weekly")}
            >
              <CalendarDays className="h-3 w-3" />
              {t("Weekly", "주간")}
            </Button>
            <Button
              size="sm"
              variant={mode === "cumulative" ? "default" : "outline"}
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => setMode("cumulative")}
            >
              <Database className="h-3 w-3" />
              {t("Cumulative", "누적")}
            </Button>
          </div>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          {t(
            "Classifies reviews by origin: Native (direct LG.com) vs Syndication (tagged as 'originally posted from' external sources)",
            "리뷰 원본 출처를 분류합니다 — Native: LG.com 직접 작성 | Syndication: 외부 채널에서 유입된 리뷰 ('originally posted from' 태그 포함)"
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
              className="h-full bg-accent rounded-r-full flex items-center justify-center transition-all"
              style={{ width: `${synPct}%` }}
            >
              {synPct > 15 && (
                <span className="text-[10px] font-bold text-accent-foreground">
                  Syndication {synPct}%
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium shrink-0">
            {mode === "weekly" ? t("Weekly", "주간") : t("Cumulative", "누적")} {stats.total.toLocaleString()}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <FileCheck className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground">{stats.native.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Native</div>
          </div>

          <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-center">
            <Share2 className="h-4 w-4 text-accent-foreground mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground">{stats.syndication.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Syndication</div>
          </div>

          {Object.entries(stats.byCountry)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([country, c]) => {
              const cNativePct = c.total > 0 ? Math.round((c.native / c.total) * 100) : 0;
              return (
                <div key={country} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm">{FLAG[country] || "🌐"}</span>
                    <span className="text-xs font-bold text-foreground">{LGE[country] || country}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{c.total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 h-3 bg-muted/30 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-primary rounded-l-full" style={{ width: `${cNativePct}%` }} />
                    <div className="h-full bg-accent rounded-r-full" style={{ width: `${100 - cNativePct}%` }} />
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
              "Reviews without 'Originally posted' in review_type → Native (direct LG.com). Reviews containing 'Originally posted' → Syndication (sourced from external platforms).",
              "review_type에 'Originally posted' 문구가 없는 리뷰 → Native (LG.com 직접 작성). 'Originally posted'가 포함된 리뷰 → Syndication (외부 플랫폼 유입)."
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
