import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourceCounts } from "@/hooks/useProductData";
import { Copy, Check, Eye, Code, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

/* ───── Types ───── */
interface TopTopic {
  rank: number; topic: string; mention_pct: number;
  positive_pct: number; negative_pct: number;
  representative_comment: string; related_products: string[];
}
interface UrgentIssue {
  rank: number; issue: string; mention_pct: number;
  pattern: string; cause: string; related_products: string[];
}
interface ChannelOverview {
  top_topics: TopTopic[];
  urgent_issues: UrgentIssue[];
  recurring_praise: string[];
  unmatched_praise: string[];
}

interface NewsletterData {
  dateRange: string;
  generatedAt: string;
  totalReviews: number;
  weeklyReviews: number;
  lgcomCount: number;
  redditCount: number;
  communityCount: number;
  wow: number;
  topProducts: { name: string; category: string; subCategory: string; count: number; posCount: number; negCount: number }[];
}

/* ───── Data hooks ───── */
function useNewsletterData() {
  const { data: sourceCounts } = useSourceCounts();
  return useQuery({
    queryKey: ["newsletter-html-data-v3", sourceCounts],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);
      const dateRange = `${format(weekAgo, "yyyy.MM.dd")} ~ ${format(now, "yyyy.MM.dd")}`;
      const generatedAt = format(now, "yyyy.MM.dd HH:mm");

      const [totalRes, weeklyRes, lastWeekRes] = await Promise.all([
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString()),
      ]);

      const lgcomCount = sourceCounts?.["lge_com"] || 0;
      const redditCount = sourceCounts?.["reddit"] || 0;
      let communityCount = 0;
      for (const [src, cnt] of Object.entries(sourceCounts || {})) {
        if (src !== "lge_com" && src !== "reddit") communityCount += cnt;
      }
      const wow = (lastWeekRes.count || 0) > 0 ? Math.round((((weeklyRes.count || 0) - (lastWeekRes.count || 0)) / (lastWeekRes.count || 1)) * 100) : 0;

      // Top products this week
      const { data: actionData } = await supabase
        .from("reviews")
        .select("product_id, sentiment, products!inner(display_name, category, sub_category)")
        .gte("collected_at", weekAgo.toISOString())
        .limit(1000);

      const productMap: Record<string, any> = {};
      for (const r of (actionData || []) as any[]) {
        const pid = r.product_id;
        if (!productMap[pid]) {
          productMap[pid] = { name: r.products.display_name, category: r.products.category, subCategory: r.products.sub_category || "", count: 0, posCount: 0, negCount: 0 };
        }
        productMap[pid].count++;
        if (r.sentiment === "positive") productMap[pid].posCount++;
        if (r.sentiment === "negative") productMap[pid].negCount++;
      }
      const topProducts = Object.values(productMap).sort((a: any, b: any) => b.count - a.count).slice(0, 10);

      return {
        dateRange, generatedAt,
        totalReviews: totalRes.count || 0,
        weeklyReviews: weeklyRes.count || 0,
        lgcomCount, redditCount, communityCount, wow,
        topProducts,
      } as NewsletterData;
    },
    staleTime: 60_000,
  });
}

/* ───── HTML Generator ───── */
function generateNewsletterHTML(d: NewsletterData, lgcom: ChannelOverview | null, reddit: ChannelOverview | null): string {
  const wowColor = d.wow >= 0 ? "#22c55e" : "#ef4444";
  const wowSign = d.wow >= 0 ? "+" : "";

  // Top products rows
  const productRows = d.topProducts.map((p, i) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="28" valign="top">
            <div style="width:24px;height:24px;border-radius:50%;background:${i < 3 ? '#A51C30' : '#999'};color:#fff;text-align:center;line-height:24px;font-weight:bold;font-size:11px;">${i + 1}</div>
          </td>
          <td style="padding-left:10px;">
            <div style="font-weight:600;font-size:13px;color:#1a1a1a;">
              ${p.subCategory ? `<span style="background:#f3e8ff;color:#7c3aed;padding:1px 6px;border-radius:4px;font-size:10px;margin-right:4px;">${p.subCategory}</span>` : ''}
              ${p.name}
            </div>
            <div style="font-size:11px;color:#666;margin-top:3px;">${p.category} · ${p.count}건 · <span style="color:#22c55e">👍${p.posCount}</span> · <span style="color:#ef4444">👎${p.negCount}</span></div>
          </td>
        </tr></table>
      </td>
    </tr>`).join("");

  // Channel overview section builder
  function buildOverviewHTML(label: string, emoji: string, overview: ChannelOverview | null): string {
    if (!overview) {
      return `
      <tr><td style="padding:20px 28px 0;">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:12px;border-left:3px solid #A51C30;padding-left:8px;">${emoji} ${label} 주간 오버뷰</div>
        <div style="text-align:center;padding:24px;color:#999;font-size:12px;border:1px dashed #e5e7eb;border-radius:8px;">AI 오버뷰를 생성해주세요</div>
      </td></tr>`;
    }

    // Topics
    const topicRows = (overview.top_topics || []).map(t => `
      <tr><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
        <div style="font-weight:600;font-size:13px;color:#1a1a1a;margin-bottom:4px;">${t.rank}. ${t.topic}</div>
        <div style="font-size:11px;color:#888;margin-bottom:4px;">언급 ${t.mention_pct}% · <span style="color:#22c55e">긍정 ${t.positive_pct}%</span> · <span style="color:#ef4444">부정 ${t.negative_pct}%</span></div>
        <div style="font-size:11px;color:#555;font-style:italic;background:#f9fafb;padding:6px 10px;border-radius:6px;margin-bottom:4px;">"${t.representative_comment}"</div>
        <div style="font-size:10px;color:#aaa;">${(t.related_products || []).map(p => `<span style="background:#f3f4f6;padding:1px 6px;border-radius:4px;margin-right:4px;">${p}</span>`).join("")}</div>
      </td></tr>`).join("");

    // Issues
    const issueRows = (overview.urgent_issues || []).map(iss => `
      <tr><td style="padding:10px 14px;border-bottom:1px solid #fecaca;">
        <div style="font-weight:600;font-size:13px;color:#dc2626;margin-bottom:4px;">${iss.rank}. ${iss.issue} <span style="font-size:11px;color:#ef4444;font-weight:500;">(${iss.mention_pct}%)</span></div>
        <div style="font-size:11px;color:#666;margin-bottom:2px;"><strong>패턴:</strong> ${iss.pattern}</div>
        <div style="font-size:11px;color:#444;margin-bottom:4px;"><strong>원인:</strong> ${iss.cause}</div>
        <div style="font-size:10px;color:#aaa;">${(iss.related_products || []).map(p => `<span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;margin-right:4px;">${p}</span>`).join("")}</div>
      </td></tr>`).join("");

    // Praise
    const praiseItems = (overview.recurring_praise || []).map(p => `<div style="padding:4px 0;font-size:12px;color:#15803d;">✅ ${p}</div>`).join("");
    const unmatchedItems = (overview.unmatched_praise || []).map(p => `<div style="padding:4px 0;font-size:12px;color:#b45309;font-style:italic;">⭐ ${p}</div>`).join("");

    return `
    <tr><td style="padding:20px 28px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:12px;border-left:3px solid #A51C30;padding-left:8px;">${emoji} ${label} 주간 오버뷰</div>

      <!-- Topics -->
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#555;text-transform:uppercase;margin-bottom:6px;">🔥 고객 주요 주제 TOP ${overview.top_topics?.length || 5}</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        ${topicRows}
      </table>

      <!-- Issues -->
      ${issueRows ? `
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#dc2626;text-transform:uppercase;margin-bottom:6px;">⚠️ 개선 시급 이슈 TOP ${overview.urgent_issues?.length || 3}</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;background:#fffbfb;margin-bottom:16px;">
        ${issueRows}
      </table>` : ""}

      <!-- Praise -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="48%" valign="top" style="border:1px solid #bbf7d0;border-radius:8px;padding:12px;background:#f0fdf4;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#15803d;text-transform:uppercase;margin-bottom:8px;">✅ 반복 칭찬 포인트</div>
          ${praiseItems || '<div style="font-size:11px;color:#aaa;">—</div>'}
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top" style="border:1px solid #fde68a;border-radius:8px;padding:12px;background:#fffbeb;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#b45309;text-transform:uppercase;margin-bottom:8px;">⭐ "비교 없이" 칭찬</div>
          ${unmatchedItems || '<div style="font-size:11px;color:#aaa;">—</div>'}
        </td>
      </tr></table>
    </td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>D2C Insight Pulse Weekly</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:24px 0;">
<table cellpadding="0" cellspacing="0" border="0" width="680" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#A51C30,#7a1424);padding:28px;text-align:center;">
  <div style="font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.6);text-transform:uppercase;margin-bottom:6px;">D2C Insight Pulse</div>
  <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px;">📊 Weekly Overview Report</div>
  <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;">${d.dateRange}</div>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Generated: ${d.generatedAt}</div>
</td></tr>

<!-- KPI -->
<tr><td style="padding:20px 28px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:10px;border-left:3px solid #A51C30;padding-left:8px;">KPI Summary</div>
  <table cellpadding="0" cellspacing="4" border="0" width="100%"><tr>
    <td width="25%" style="text-align:center;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;">Weekly Total</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin:2px 0;">${(d.weeklyReviews).toLocaleString()}</div>
      <div style="font-size:11px;color:${wowColor};font-weight:600;">${wowSign}${d.wow}% WoW</div>
      <div style="font-size:9px;color:#aaa;">누적 ${d.totalReviews.toLocaleString()}건</div>
    </td>
    <td width="25%" style="text-align:center;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;">LG.com</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin:2px 0;">${d.lgcomCount.toLocaleString()}</div>
      <div style="font-size:9px;color:#aaa;">누적</div>
    </td>
    <td width="25%" style="text-align:center;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;">Reddit</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin:2px 0;">${d.redditCount.toLocaleString()}</div>
      <div style="font-size:9px;color:#aaa;">누적</div>
    </td>
    <td width="25%" style="text-align:center;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;">Community</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin:2px 0;">${d.communityCount.toLocaleString()}</div>
      <div style="font-size:9px;color:#aaa;">타채널</div>
    </td>
  </tr></table>
</td></tr>

<!-- Top 10 Products -->
<tr><td style="padding:20px 28px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:10px;border-left:3px solid #A51C30;padding-left:8px;">📦 주간 TOP 제품 (리뷰량 기준)</div>
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    ${productRows}
  </table>
</td></tr>

${buildOverviewHTML("LG.COM", "🏪", lgcom)}
${buildOverviewHTML("REDDIT", "💬", reddit)}

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

  // AI overview states
  const [lgcomOverview, setLgcomOverview] = useState<ChannelOverview | null>(null);
  const [redditOverview, setRedditOverview] = useState<ChannelOverview | null>(null);
  const [lgcomLoading, setLgcomLoading] = useState(false);
  const [redditLoading, setRedditLoading] = useState(false);

  const generateOverview = async (channel: "lgcom" | "reddit") => {
    const setLoading = channel === "lgcom" ? setLgcomLoading : setRedditLoading;
    const setData = channel === "lgcom" ? setLgcomOverview : setRedditOverview;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-overview-summary", { body: { channel } });
      if (error) throw error;
      if (result?.overview) {
        setData(result.overview);
        toast.success(`${channel === "lgcom" ? "LG.com" : "Reddit"} 오버뷰 생성 완료!`);
      }
    } catch (err: any) {
      toast.error("생성 실패: " + (err.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  };

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

  const html = generateNewsletterHTML(data, lgcomOverview, redditOverview);

  const handleCopy = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    toast.success("뉴스레터 HTML이 클립보드에 복사되었습니다!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-heading">📬 금주의 뉴스레터</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{data.dateRange}</Badge>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">매주 화요일 10:00 발행</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors flex items-center gap-1 ${viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Eye className="h-3 w-3" /> 미리보기
              </button>
              <button
                onClick={() => setViewMode("html")}
                className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors flex items-center gap-1 ${viewMode === "html" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
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
          AI 오버뷰를 먼저 생성한 후 HTML을 복사하면 채널별 분석 결과가 함께 포함됩니다.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* AI Overview generate buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => generateOverview("lgcom")}
            disabled={lgcomLoading}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {lgcomLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {lgcomLoading ? "LG.com 분석 중..." : lgcomOverview ? "✅ LG.com 오버뷰 포함됨" : "🏪 LG.com 오버뷰 생성"}
          </button>
          <button
            onClick={() => generateOverview("reddit")}
            disabled={redditLoading}
            className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {redditLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {redditLoading ? "Reddit 분석 중..." : redditOverview ? "✅ Reddit 오버뷰 포함됨" : "💬 Reddit 오버뷰 생성"}
          </button>
        </div>

        {viewMode === "preview" ? (
          <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
            <iframe
              srcDoc={html}
              title="Newsletter Preview"
              className="w-full border-0"
              style={{ height: "800px" }}
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
