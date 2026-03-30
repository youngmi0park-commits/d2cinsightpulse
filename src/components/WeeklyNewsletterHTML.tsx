import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourceCounts } from "@/hooks/useProductData";
import { useState } from "react";
import { Copy, Check, Eye, Code, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

/* ───── Data hook ───── */

interface NewsletterData {
  dateRange: string;
  generatedAt: string;
  totalReviews: number;
  weeklyReviews: number;
  lgcomCount: number;
  redditCount: number;
  communityCount: number;
  wow: number;
  topActions: {
    name: string;
    category: string;
    count: number;
    posCount: number;
    negCount: number;
    summary: string;
  }[];
  lgcom: {
    total: number;
    posPct: number;
    negPct: number;
    neutralPct: number;
    topKeywords: { keyword: string; count: number }[];
  };
  reddit: {
    total: number;
    reviewCount: number;
    vocCount: number;
    questionCount: number;
    painPoints: { keyword: string; count: number }[];
  };
  categoryHighlights: {
    emoji: string;
    category: string;
    total: number;
    pos: number;
    neg: number;
    posPct: number;
    topProduct: string;
  }[];
}

function useNewsletterData() {
  const { data: sourceCounts } = useSourceCounts();

  return useQuery({
    queryKey: ["newsletter-html-data", sourceCounts],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);

      const dateRange = `${format(weekAgo, "yyyy.MM.dd")} ~ ${format(now, "yyyy.MM.dd")}`;
      const generatedAt = format(now, "yyyy.MM.dd HH:mm");

      // Counts
      const { count: totalReviews } = await supabase.from("reviews").select("*", { count: "exact", head: true });
      const { count: weeklyReviews } = await supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", weekAgo.toISOString());
      const { count: lastWeekReviews } = await supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString());

      const lgcomCount = (sourceCounts?.["lge_com"] || 0);
      const redditCount = (sourceCounts?.["reddit"] || 0);
      let communityCount = 0;
      for (const [src, cnt] of Object.entries(sourceCounts || {})) {
        if (src !== "lge_com" && src !== "reddit") communityCount += cnt;
      }

      const wow = (lastWeekReviews || 0) > 0 ? Math.round((((weeklyReviews || 0) - (lastWeekReviews || 0)) / (lastWeekReviews || 1)) * 100) : 0;

      // Top 3 actions
      const { data: actionData } = await supabase
        .from("reviews")
        .select("product_id, sentiment, sentiment_score, content, source, products!inner(model_number, display_name, category)")
        .gte("collected_at", weekAgo.toISOString())
        .limit(1000);

      const productMap: Record<string, any> = {};
      for (const r of (actionData || []) as any[]) {
        const pid = r.product_id;
        if (!productMap[pid]) {
          productMap[pid] = { id: pid, name: r.products.display_name || r.products.model_number, category: r.products.category, count: 0, posCount: 0, negCount: 0 };
        }
        productMap[pid].count++;
        if (r.sentiment === "positive") productMap[pid].posCount++;
        if (r.sentiment === "negative") productMap[pid].negCount++;
      }
      const topActions = Object.values(productMap)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 3)
        .map((p: any) => {
          let summary = "";
          if (p.negCount > p.posCount) summary = `부정 리뷰 ${p.negCount}건 집중 — CRM 대응 및 FAQ 업데이트 필요`;
          else if (p.posCount > 0) summary = `긍정 리뷰 ${p.posCount}건 확보 — PDP, SNS 콘텐츠 활용 가능`;
          else summary = `리뷰 ${p.count}건 수집 — 감성 분석 기반 콘텐츠 기획 필요`;
          return { name: p.name, category: p.category, count: p.count, posCount: p.posCount, negCount: p.negCount, summary };
        });

      // LG.com sentiment
      const { data: lgReviews } = await supabase.from("reviews").select("sentiment").like("source", "lge_com%").limit(1000);
      const lgTotal = lgReviews?.length || 0;
      const lgPos = lgReviews?.filter(r => r.sentiment === "positive").length || 0;
      const lgNeg = lgReviews?.filter(r => r.sentiment === "negative").length || 0;
      const { data: lgKw } = await supabase.from("trending_keywords").select("keyword, count").eq("source", "lge_com").eq("sentiment", "positive").order("count", { ascending: false }).limit(3);

      // Reddit
      const { data: redditReviews } = await supabase.from("reviews").select("review_type").eq("source", "reddit").limit(1000);
      const redditTotal = redditReviews?.length || 0;
      const { data: redditPP } = await supabase.from("trending_keywords").select("keyword, count").eq("source", "reddit").eq("sentiment", "negative").order("count", { ascending: false }).limit(3);

      // Category highlights (non-lgcom)
      const { data: catData } = await supabase.from("reviews").select("sentiment, products!inner(category, display_name)").gte("collected_at", weekAgo.toISOString()).not("source", "like", "lge_com%").limit(1000);
      const catMap: Record<string, any> = {};
      const TV_KW = ["tv", "oled", "qned", "nanocell"];
      const EMOJI: Record<string, string> = { TV: "📺", Refrigerator: "🧊", "Washer/Dryer": "🧺", Monitor: "🖥️", Audio: "🔊", Laptop: "💻" };
      for (const r of (catData || []) as any[]) {
        let cat = (r.products?.category || "Other").toLowerCase();
        if (TV_KW.some(kw => cat.includes(kw))) cat = "TV";
        else if (cat.includes("refriger") || cat.includes("fridge")) cat = "Refrigerator";
        else if (cat.includes("wash") || cat.includes("laundry")) cat = "Washer/Dryer";
        else if (cat.includes("monitor")) cat = "Monitor";
        else if (cat.includes("sound") || cat.includes("audio")) cat = "Audio";
        else if (cat.includes("laptop") || cat.includes("gram")) cat = "Laptop";
        else cat = cat.charAt(0).toUpperCase() + cat.slice(1);
        if (!catMap[cat]) catMap[cat] = { pos: 0, neg: 0, total: 0, topProduct: "" };
        catMap[cat].total++;
        if (r.sentiment === "positive") catMap[cat].pos++;
        if (r.sentiment === "negative") catMap[cat].neg++;
        if (!catMap[cat].topProduct) catMap[cat].topProduct = r.products?.display_name || "";
      }
      const categoryHighlights = Object.entries(catMap)
        .filter(([, v]: any) => v.total >= 3)
        .sort((a: any, b: any) => b[1].total - a[1].total)
        .slice(0, 6)
        .map(([cat, v]: any) => ({ emoji: EMOJI[cat] || "📦", category: cat, total: v.total, pos: v.pos, neg: v.neg, posPct: v.total > 0 ? Math.round((v.pos / v.total) * 100) : 0, topProduct: v.topProduct }));

      return {
        dateRange, generatedAt,
        totalReviews: totalReviews || 0, weeklyReviews: weeklyReviews || 0,
        lgcomCount, redditCount, communityCount, wow,
        topActions,
        lgcom: { total: lgTotal, posPct: lgTotal > 0 ? Math.round((lgPos / lgTotal) * 100) : 0, negPct: lgTotal > 0 ? Math.round((lgNeg / lgTotal) * 100) : 0, neutralPct: lgTotal > 0 ? Math.round(((lgTotal - lgPos - lgNeg) / lgTotal) * 100) : 0, topKeywords: (lgKw || []).map(k => ({ keyword: k.keyword, count: k.count })) },
        reddit: { total: redditTotal, reviewCount: redditReviews?.filter((r: any) => r.review_type === "REVIEW").length || 0, vocCount: redditReviews?.filter((r: any) => r.review_type === "VOC").length || 0, questionCount: redditReviews?.filter((r: any) => r.review_type === "QUESTION").length || 0, painPoints: (redditPP || []).map(k => ({ keyword: k.keyword, count: k.count })) },
        categoryHighlights,
      } as NewsletterData;
    },
    staleTime: 60_000,
  });
}

/* ───── HTML generator ───── */

function generateNewsletterHTML(d: NewsletterData): string {
  const wowColor = d.wow >= 0 ? "#22c55e" : "#ef4444";
  const wowSign = d.wow >= 0 ? "+" : "";

  const actionRows = d.topActions.map((a, i) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="32" valign="top">
            <div style="width:28px;height:28px;border-radius:50%;background:${i===0?'#A51C30':i===1?'#c85a6a':'#999'};color:#fff;text-align:center;line-height:28px;font-weight:bold;font-size:13px;">${i+1}</div>
          </td>
          <td style="padding-left:12px;">
            <div style="font-weight:600;font-size:14px;color:#1a1a1a;">${a.name} <span style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:11px;color:#666;font-weight:500;">${a.category}</span></div>
            <div style="font-size:12px;color:#666;margin-top:4px;">주간 ${a.count}건 · 긍정 ${a.posCount} · 부정 ${a.negCount}</div>
            <div style="font-size:12px;color:#444;margin-top:4px;">💡 ${a.summary}</div>
          </td>
        </tr></table>
      </td>
    </tr>`).join("");

  const catRows = d.categoryHighlights.map(c => `
    <td width="33%" valign="top" style="padding:6px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;">
        <tr><td style="padding:12px;">
          <div style="font-size:16px;margin-bottom:4px;">${c.emoji} <strong>${c.category}</strong> <span style="font-size:11px;color:#999;">${c.total}건</span></div>
          <div style="background:#e5e7eb;height:6px;border-radius:3px;overflow:hidden;margin:6px 0;">
            <div style="background:#22c55e;height:6px;width:${c.posPct}%;"></div>
          </div>
          <div style="font-size:10px;color:#888;">긍정 ${c.pos} / 부정 ${c.neg}</div>
          ${c.topProduct ? `<div style="font-size:10px;color:#aaa;margin-top:2px;">🏷️ ${c.topProduct}</div>` : ""}
        </td></tr>
      </table>
    </td>`);

  // Split into rows of 3
  const catTableRows: string[] = [];
  for (let i = 0; i < catRows.length; i += 3) {
    catTableRows.push(`<tr>${catRows.slice(i, i + 3).join("")}</tr>`);
  }

  const lgKwRows = d.lgcom.topKeywords.map(k => `<span style="display:inline-block;background:#f0fdf4;color:#15803d;padding:3px 10px;border-radius:12px;font-size:11px;margin:2px 4px 2px 0;">${k.keyword} (${k.count})</span>`).join("");

  const painRows = d.reddit.painPoints.map(p => `<span style="display:inline-block;background:#fef2f2;color:#dc2626;padding:3px 10px;border-radius:12px;font-size:11px;margin:2px 4px 2px 0;">${p.keyword} (${p.count})</span>`).join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>D2C Insight Pulse Weekly</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:24px 0;">
<table cellpadding="0" cellspacing="0" border="0" width="640" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#A51C30,#7a1424);padding:32px 28px;text-align:center;">
  <div style="font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:8px;">D2C Insight Pulse</div>
  <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px;">📊 Weekly Overview Report</div>
  <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:8px;">${d.dateRange}</div>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;">Generated: ${d.generatedAt}</div>
</td></tr>

<!-- KPI Summary -->
<tr><td style="padding:24px 28px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:12px;border-left:3px solid #A51C30;padding-left:8px;">KPI Summary</div>
  <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td width="25%" style="text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;">Total Reviews</div>
      <div style="font-size:24px;font-weight:700;color:#1a1a1a;margin:4px 0;">${(d.weeklyReviews).toLocaleString()}</div>
      <div style="font-size:11px;color:${wowColor};font-weight:600;">${wowSign}${d.wow}% WoW</div>
      <div style="font-size:10px;color:#aaa;">누적 ${d.totalReviews.toLocaleString()}건</div>
    </td>
    <td width="4"></td>
    <td width="25%" style="text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;">LG.com</div>
      <div style="font-size:24px;font-weight:700;color:#1a1a1a;margin:4px 0;">${d.lgcomCount.toLocaleString()}</div>
      <div style="font-size:10px;color:#aaa;">누적</div>
    </td>
    <td width="4"></td>
    <td width="25%" style="text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;">Reddit</div>
      <div style="font-size:24px;font-weight:700;color:#1a1a1a;margin:4px 0;">${d.redditCount.toLocaleString()}</div>
      <div style="font-size:10px;color:#aaa;">누적</div>
    </td>
    <td width="4"></td>
    <td width="25%" style="text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;">Community</div>
      <div style="font-size:24px;font-weight:700;color:#1a1a1a;margin:4px 0;">${d.communityCount.toLocaleString()}</div>
      <div style="font-size:10px;color:#aaa;">타채널</div>
    </td>
  </tr></table>
</td></tr>

<!-- TOP 3 Actions -->
<tr><td style="padding:24px 28px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:12px;border-left:3px solid #A51C30;padding-left:8px;">TOP 3 Actions This Week</div>
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    ${actionRows}
  </table>
</td></tr>

<!-- Channel Performance -->
<tr><td style="padding:24px 28px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:12px;border-left:3px solid #A51C30;padding-left:8px;">Channel Performance</div>
  <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td width="48%" valign="top" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
      <div style="font-weight:600;font-size:13px;color:#1a1a1a;margin-bottom:8px;">🏬 LG.com · ${d.lgcom.total.toLocaleString()} reviews</div>
      <div style="background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden;margin-bottom:6px;">
        <div style="background:#22c55e;height:8px;width:${d.lgcom.posPct}%;display:inline-block;"></div><div style="background:#ef4444;height:8px;width:${d.lgcom.negPct}%;display:inline-block;"></div>
      </div>
      <div style="font-size:10px;color:#888;margin-bottom:8px;">긍정 ${d.lgcom.posPct}% · 중립 ${d.lgcom.neutralPct}% · 부정 ${d.lgcom.negPct}%</div>
      <div style="font-size:10px;color:#666;font-weight:600;margin-bottom:4px;">TOP POSITIVE</div>
      <div>${lgKwRows || '<span style="font-size:11px;color:#aaa;">No data</span>'}</div>
    </td>
    <td width="4%"></td>
    <td width="48%" valign="top" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
      <div style="font-weight:600;font-size:13px;color:#1a1a1a;margin-bottom:8px;">📡 Reddit · ${d.reddit.total.toLocaleString()} signals</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;"><tr>
        <td style="text-align:center;padding:6px;border:1px solid #e5e7eb;border-radius:6px;">
          <div style="font-size:16px;font-weight:700;color:#A51C30;">${d.reddit.reviewCount}</div>
          <div style="font-size:9px;color:#999;">REVIEW</div>
        </td>
        <td width="4"></td>
        <td style="text-align:center;padding:6px;border:1px solid #e5e7eb;border-radius:6px;">
          <div style="font-size:16px;font-weight:700;color:#f59e0b;">${d.reddit.vocCount}</div>
          <div style="font-size:9px;color:#999;">VOC</div>
        </td>
        <td width="4"></td>
        <td style="text-align:center;padding:6px;border:1px solid #e5e7eb;border-radius:6px;">
          <div style="font-size:16px;font-weight:700;color:#666;">${d.reddit.questionCount}</div>
          <div style="font-size:9px;color:#999;">Q&A</div>
        </td>
      </tr></table>
      <div style="font-size:10px;color:#666;font-weight:600;margin-bottom:4px;">PAIN POINTS</div>
      <div>${painRows || '<span style="font-size:11px;color:#aaa;">No data</span>'}</div>
    </td>
  </tr></table>
</td></tr>

<!-- Category Highlights -->
${d.categoryHighlights.length > 0 ? `
<tr><td style="padding:24px 28px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:12px;border-left:3px solid #A51C30;padding-left:8px;">Weekly Category Highlights</div>
  <table cellpadding="0" cellspacing="0" border="0" width="100%">
    ${catTableRows.join("")}
  </table>
</td></tr>` : ""}

<!-- Footer -->
<tr><td style="padding:24px 28px;margin-top:16px;">
  <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
    <div style="font-size:11px;color:#999;">D2C Insight Pulse — Powered by AI-driven Review Analytics</div>
    <div style="font-size:10px;color:#bbb;margin-top:4px;">매주 화요일 10:00 발행 · LG전자 글로벌마케팅센터</div>
    <div style="font-size:10px;color:#ccc;margin-top:4px;">본 뉴스레터는 사내 배포용으로 외부 공유를 금합니다.</div>
  </div>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/* ───── Component ───── */

export function WeeklyNewsletterHTML() {
  const { data, isLoading } = useNewsletterData();
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");
  const [copied, setCopied] = useState(false);

  if (isLoading || !data) {
    return (
      <Card className="border border-border bg-card">
        <CardContent className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          뉴스레터 데이터 로딩 중...
        </CardContent>
      </Card>
    );
  }

  const html = generateNewsletterHTML(data);

  const handleCopy = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    toast.success("뉴스레터 HTML이 클립보드에 복사되었습니다! Outlook 메일 본문에 붙여넣기 하세요.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-heading">📬 금주의 뉴스레터</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {data.dateRange}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              매주 화요일 10:00 발행
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors flex items-center gap-1 ${
                  viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3 w-3" /> 미리보기
              </button>
              <button
                onClick={() => setViewMode("html")}
                className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors flex items-center gap-1 ${
                  viewMode === "html" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code className="h-3 w-3" /> HTML
              </button>
            </div>
            <Button onClick={handleCopy} size="sm" className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "복사 완료!" : "HTML 복사"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Outlook 메일 본문에 HTML을 붙여넣어 사내 발송하세요. 인라인 CSS로 모든 이메일 클라이언트에서 동일하게 표시됩니다.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {viewMode === "preview" ? (
          <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
            <iframe
              srcDoc={html}
              title="Newsletter Preview"
              className="w-full border-0"
              style={{ height: "700px" }}
            />
          </div>
        ) : (
          <div className="relative">
            <pre className="bg-muted/50 border border-border rounded-lg p-4 text-[11px] text-foreground/80 overflow-auto max-h-[600px] whitespace-pre-wrap break-all font-mono">
              {html}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
