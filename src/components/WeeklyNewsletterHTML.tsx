import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Eye, Code, Loader2, Rocket, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

/* ───── Types ───── */
interface TopTopic { rank: number; topic: string; mention_pct: number; positive_pct: number; negative_pct: number; representative_comment: string; related_products: string[]; }
interface UrgentIssue { rank: number; issue: string; mention_pct: number; pattern: string; cause: string; related_products: string[]; }
interface ProductMention { rank: number; name: string; category: string; mention_count: number; pos_summary: string; neg_summary: string; praise_points: string[]; }
interface ChannelInsight {
  top_products: ProductMention[];
  top_topics: TopTopic[];
  urgent_issues: UrgentIssue[];
  recurring_praise: string[];
}

interface NewsletterData {
  dateRange: string; generatedAt: string;
  weeklyReviews: number; wow: number;
}

/* ───── Data hook ───── */
function useNewsletterData() {
  return useQuery({
    queryKey: ["newsletter-v5"],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);
      const dateRange = `${format(weekAgo, "yyyy.MM.dd")} ~ ${format(now, "yyyy.MM.dd")}`;
      const generatedAt = format(now, "yyyy.MM.dd HH:mm");

      const [weeklyRes, lastWeekRes] = await Promise.all([
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString()),
      ]);

      const wow = (lastWeekRes.count || 0) > 0 ? Math.round((((weeklyRes.count || 0) - (lastWeekRes.count || 0)) / (lastWeekRes.count || 1)) * 100) : 0;

      return { dateRange, generatedAt, weeklyReviews: weeklyRes.count || 0, wow } as NewsletterData;
    },
    staleTime: 60_000,
  });
}

/* ───── HTML Generator (preview fallback — no AI) ───── */
function generatePreviewHTML(d: NewsletterData): string {
  const BASE_URL = window.location.origin;
  const wowColor = d.wow >= 0 ? "#006600" : "#A50034";
  const wowSign = d.wow >= 0 ? "+" : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<title>D2C Insight Pulse Weekly</title></head>
<body style="margin:0;padding:0;background-color:#F0ECE4;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F0ECE4;">
<tr><td align="center" style="padding:24px 0;">
<table cellpadding="0" cellspacing="0" border="0" width="680" style="background:#FAFAF7;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

<!-- Header -->
<tr><td style="background:#A50034;padding:28px 28px 24px;text-align:center;">
  <div style="font-family:Inter,'Apple SD Gothic Neo',sans-serif;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">D2C Insight Pulse</div>
  <div style="font-family:Inter,sans-serif;font-size:11px;color:rgba(255,255,255,0.6);font-style:italic;margin-top:2px;">Weekly Insight Report</div>
  <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.2);">
    <div style="font-size:12px;color:rgba(255,255,255,0.85);">${d.dateRange}</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;">Generated: ${d.generatedAt}</div>
  </div>
</td></tr>

<!-- Weekly KPI -->
<tr><td style="padding:20px 28px 0;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;border-radius:10px;overflow:hidden;">
    <tr><td style="padding:16px 20px;text-align:center;">
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">이번 주 수집 리뷰</div>
      <div style="font-size:32px;font-weight:800;color:#1a1a1a;margin:4px 0;font-family:Inter,sans-serif;">${d.weeklyReviews.toLocaleString()}<span style="font-size:14px;color:#888;font-weight:400;">건</span></div>
      <div style="font-size:12px;color:${wowColor};font-weight:700;">${wowSign}${d.wow}% vs 전주</div>
    </td></tr>
  </table>
</td></tr>

<!-- Placeholder for AI insights -->
<tr><td style="padding:24px 28px;">
  <div style="text-align:center;padding:40px 20px;color:#999;font-size:13px;border:1.5px dashed #E0DBD3;border-radius:10px;background:#F7F4EF;">
    🚀 <strong>원클릭 생성</strong> 버튼을 눌러 AI 기반 주간 인사이트를 생성하세요
  </div>
</td></tr>

<!-- CTA Banner -->
<tr><td style="padding:0 28px 24px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E0DBD3;border-radius:12px;overflow:hidden;">
    <tr><td colspan="2" style="height:4px;background:#A50034;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:20px 24px;">
      <div style="font-family:Inter,Arial,sans-serif;font-size:20px;font-weight:800;color:#1A1A1A;letter-spacing:-0.3px;line-height:1.3;">Review-to-Asset, <span style="color:#A50034;">Instantly.</span></div>
      <div style="font-size:12px;color:#6B6B6B;line-height:1.7;margin-top:6px;">리뷰 분석부터 광고 카피까지 — 리뷰가 증명한 메시지로 만듭니다.</div>
      <a href="${BASE_URL}/" style="display:inline-block;margin-top:12px;background:#A50034;color:#fff;border-radius:6px;padding:10px 20px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:600;text-decoration:none;">마케팅 에셋 스튜디오 바로가기 →</a>
    </td></tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:0 28px 20px;">
  <div style="border-top:1px solid #E0DBD3;padding-top:14px;text-align:center;">
    <div style="font-size:10px;color:#999;">D2C Insight Pulse — Powered LG전자 D2C마케팅전략팀</div>
    <div style="font-size:9px;color:#ccc;margin-top:4px;">본 뉴스레터는 사내 배포용으로 외부 공유를 금합니다.</div>
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
  const [fullGenLoading, setFullGenLoading] = useState(false);
  const [fullGenHtml, setFullGenHtml] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const generateFullNewsletter = async () => {
    setFullGenLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("serve-newsletter", {
        body: { format: "json", baseUrl: window.location.origin },
      });
      if (error) throw error;
      if (result?.html) {
        setFullGenHtml(result.html);
        toast.success("✅ AI 인사이트 뉴스레터가 생성되었습니다!");
      }
    } catch (err: any) {
      toast.error("뉴스레터 생성 실패: " + (err.message || "Unknown"));
    } finally {
      setFullGenLoading(false);
    }
  };

  const handleCopy = () => {
    const target = fullGenHtml || (data ? generatePreviewHTML(data) : "");
    navigator.clipboard.writeText(target);
    setCopied(true);
    toast.success("📋 뉴스레터 HTML이 클립보드에 복사되었습니다!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestSend = async () => {
    setSendingTest(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("serve-newsletter", {
        body: { format: "json", baseUrl: window.location.origin, sendTo: "youngmi0.park@lge.com" },
      });
      if (error) throw error;
      if (result?.emailSent) {
        toast.success("📧 youngmi0.park@lge.com 으로 테스트 메일이 발송되었습니다!");
      } else {
        toast.error("발송 실패: " + (result?.emailError || "Unknown"));
      }
    } catch (err: any) {
      toast.error("메일 발송 실패: " + (err.message || "Unknown"));
    } finally {
      setSendingTest(false);
    }
  };

  if (isLoading || !data) {
    return (
      <Card className="border border-border bg-card">
        <CardContent className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 뉴스레터 데이터 로딩 중...
        </CardContent>
      </Card>
    );
  }

  const html = generatePreviewHTML(data);

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-heading">📬 금주의 뉴스레터</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{data.dateRange}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={generateFullNewsletter}
              disabled={fullGenLoading}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-primary to-primary/80"
            >
              {fullGenLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              {fullGenLoading ? "AI 생성 중..." : fullGenHtml ? "✅ 생성 완료" : "🚀 원클릭 생성"}
            </Button>

            {fullGenHtml && (
              <>
                <Button onClick={handleCopy} size="sm" variant="outline" className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "복사 완료!" : "📋 HTML 복사"}
                </Button>
                <Button
                  onClick={handleTestSend}
                  disabled={sendingTest}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {sendingTest ? "발송 중..." : "📧 메일링 테스트"}
                </Button>
              </>
            )}

            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <button onClick={() => setViewMode("preview")} className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors flex items-center gap-1 ${viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <Eye className="h-3 w-3" /> 미리보기
              </button>
              <button onClick={() => setViewMode("html")} className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors flex items-center gap-1 ${viewMode === "html" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <Code className="h-3 w-3" /> HTML
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {viewMode === "preview" ? (
          <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
            <iframe srcDoc={fullGenHtml || html} title="Newsletter Preview" className="w-full border-0" style={{ height: "900px" }} />
          </div>
        ) : (
          <pre className="bg-muted/50 border border-border rounded-lg p-4 text-[11px] text-foreground/80 overflow-auto max-h-[600px] whitespace-pre-wrap break-all font-mono">{fullGenHtml || html}</pre>
        )}
      </CardContent>
    </Card>
  );
}
