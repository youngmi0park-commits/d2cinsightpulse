import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Camera, ShieldAlert, Sparkles, Loader2 } from "lucide-react";

interface VisionRow {
  id: string;
  source: string;
  title: string | null;
  media_urls: string[] | null;
  multimodal_analysis: any;
  products?: { display_name: string; category: string } | null;
}

export default function VisionGalleryPage() {
  const [rows, setRows] = useState<VisionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, source, title, media_urls, multimodal_analysis, products(display_name, category)")
        .eq("has_media", true)
        .in("media_type", ["photo", "mixed"])
        .eq("media_analysis_status", "done")
        .order("multimodal_analyzed_at", { ascending: false })
        .limit(5);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[hsl(4,58%,44%)]" />
            <h1 className="text-2xl font-bold font-heading">사진 비전 분석 갤러리</h1>
            <Badge variant="outline" className="text-[10px]">gemini-2.5-pro</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            첨부 사진 원본과 추출된 분석 JSON을 한눈에 비교합니다. (LG.com 리뷰 본문은 PII 보호를 위해 비공개)
          </p>
        </header>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="border border-dashed rounded-lg p-10 text-center text-muted-foreground">
            분석 완료된 사진 리뷰가 없습니다.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {rows.map((r, idx) => {
            const a = r.multimodal_analysis || {};
            const img = r.media_urls?.[0];
            const cond = a.product_condition;
            const isBad = cond === "damaged" || cond === "defective";
            const isUrgent = a.action_required === "urgent_qc_review";
            return (
              <article
                key={r.id}
                className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                      #{idx + 1}
                    </span>
                    <Camera className="h-3.5 w-3.5 text-teal-600" />
                    <span className="text-xs font-medium">
                      {r.products?.display_name || "—"}
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      {r.source}
                    </Badge>
                  </div>
                  {typeof a.confidence === "number" && (
                    <span className="text-[10px] text-muted-foreground">
                      신뢰도 {(a.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-0">
                  <div className="bg-muted/40 flex items-center justify-center p-4 border-r border-border min-h-[240px]">
                    {img ? (
                      <img
                        src={img}
                        alt={a.summary_ko || "review media"}
                        className="max-h-[260px] object-contain rounded"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">이미지 없음</span>
                    )}
                  </div>

                  <div className="p-4 space-y-3 text-sm">
                    <p className="text-foreground/90 leading-relaxed">{a.summary_ko}</p>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isBad
                            ? "border-destructive/40 text-destructive bg-destructive/10"
                            : ""
                        }`}
                      >
                        상태: {cond || "unclear"}
                      </Badge>
                      {a.installation_quality && (
                        <Badge variant="outline" className="text-[10px]">
                          설치: {a.installation_quality}
                        </Badge>
                      )}
                      {a.visible_model_hint && (
                        <Badge variant="outline" className="text-[10px]">
                          모델: {a.visible_model_hint}
                        </Badge>
                      )}
                      {isUrgent && (
                        <Badge className="text-[10px] bg-destructive text-destructive-foreground gap-0.5">
                          <ShieldAlert className="h-2.5 w-2.5" /> 긴급 QC
                        </Badge>
                      )}
                    </div>

                    {a.environment && (
                      <p className="text-[11px] text-muted-foreground">
                        🌐 환경: {a.environment}
                      </p>
                    )}

                    {Array.isArray(a.damage_signals) && a.damage_signals.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {a.damage_signals.map((s: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive"
                          >
                            ⚠ {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <details className="border-t border-border bg-muted/20">
                  <summary className="cursor-pointer px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground">
                    📄 추출 JSON 보기
                  </summary>
                  <pre className="px-4 py-3 text-[10px] font-mono leading-relaxed overflow-x-auto text-foreground/80 bg-background/50">
{JSON.stringify(a, null, 2)}
                  </pre>
                </details>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}