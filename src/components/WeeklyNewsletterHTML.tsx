import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourceCounts } from "@/hooks/useProductData";
import { Copy, Check, Eye, Code, Loader2, Rocket, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

/* ───── Types ───── */
interface NewsletterData {
  dateRange: string; generatedAt: string;
  weeklyReviews: number; wow: number;
  totalReviews: number; productCount: number;
  channels: { name: string; count: number; color: string }[];
}

/* ───── Channel color map ───── */
const CHANNEL_COLORS: Record<string, { label: string; color: string; dot: string }> = {
  lge_com: { label: "LG.com", color: "#A50034", dot: "#A50034" },
  reddit: { label: "Reddit", color: "#FF4500", dot: "#FF4500" },
  trustpilot: { label: "Trustpilot", color: "#00B67A", dot: "#00B67A" },
  youtube: { label: "YouTube", color: "#FF0000", dot: "#FF0000" },
  consumer_reports: { label: "Consumer Reports", color: "#0066CC", dot: "#0066CC" },
  amazon: { label: "Amazon", color: "#FF9900", dot: "#FF9900" },
};

/* ───── Data hook ───── */
function useNewsletterData() {
  const { data: sourceCounts } = useSourceCounts();
  return useQuery({
    queryKey: ["newsletter-v6", sourceCounts],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);
      const dateRange = `${format(weekAgo, "yyyy.MM.dd")} ~ ${format(now, "yyyy.MM.dd")}`;
      const generatedAt = format(now, "yyyy.MM.dd HH:mm");

      const [weeklyRes, lastWeekRes, totalRes, productRes] = await Promise.all([
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const wow = (lastWeekRes.count || 0) > 0 ? Math.round((((weeklyRes.count || 0) - (lastWeekRes.count || 0)) / (lastWeekRes.count || 1)) * 100) : 0;

      // Build channel list from source counts
      const entries = Object.entries(sourceCounts || {}).sort((a, b) => b[1] - a[1]);
      const topChannels = entries.slice(0, 6).map(([src, cnt]) => {
        const cfg = CHANNEL_COLORS[src] || { label: src, color: "#888", dot: "#888" };
        return { name: cfg.label, count: cnt, color: cfg.dot };
      });
      const otherCount = entries.slice(6).reduce((sum, [, cnt]) => sum + cnt, 0);
      const otherChannelCount = entries.length - 6;
      if (otherCount > 0) {
        topChannels.push({ name: `+${otherChannelCount}개 채널`, count: otherCount, color: "#999" });
      }

      return {
        dateRange, generatedAt,
        weeklyReviews: weeklyRes.count || 0, wow,
        totalReviews: totalRes.count || 0,
        productCount: productRes.count || 0,
        channels: topChannels,
      } as NewsletterData;
    },
    staleTime: 60_000,
  });
}

/* ───── Data bar HTML helper ───── */
function dataBarHTML(d: NewsletterData): string {
  const channelBadges = d.channels.map(ch => {
    const isLgcom = ch.name === "LG.com";
    if (isLgcom) {
      return `<td style="padding:0 4px;">
        <div style="display:inline-block;background:#A50034;color:#fff;border-radius:14px;padding:4px 12px;font-size:11px;font-weight:700;white-space:nowrap;">${ch.name} ${ch.count.toLocaleString()}</div>
      </td>`;
    }
    return `<td style="padding:0 4px;">
      <div style="display:inline-block;border:1px solid #E0DBD3;border-radius:14px;padding:4px 10px;font-size:11px;color:#444;white-space:nowrap;">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${ch.color};margin-right:4px;vertical-align:middle;"></span>${ch.name} ${ch.count.toLocaleString()}
      </div>
    </td>`;
  }).join("");

  return `
  <tr><td style="padding:16px 28px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;border-radius:10px;overflow:hidden;background:#FAFAF7;">
      <tr><td style="padding:12px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="font-size:12px;font-weight:700;color:#333;">📊 데이터 수집 통합 현황</td>
          <td style="text-align:right;font-size:11px;color:#666;">
            총 <strong style="color:#1a1a1a;font-size:13px;">${d.totalReviews.toLocaleString()}</strong>건 · <span style="color:#888;">${d.productCount.toLocaleString()}개 제품</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 16px 12px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>${channelBadges}</tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

/* ───── HTML Generator (preview fallback — no AI) ───── */
function generatePreviewHTML(d: NewsletterData): string {
  const BASE_URL = window.location.origin;

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
<tr><td style="background:#A50034;padding:28px 28px 20px;text-align:center;">
  <div style="font-family:Inter,'Apple SD Gothic Neo',sans-serif;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">D2C Insight Pulse</div>
  <div style="font-family:Inter,sans-serif;font-size:11px;color:rgba(255,255,255,0.6);font-style:italic;margin-top:2px;">Weekly Insight Report</div>
  <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.15);">
    <div style="font-size:11px;color:rgba(255,255,255,0.9);line-height:1.7;max-width:520px;margin:0 auto;">
      <strong style="color:#fff;">고객의 생생한 목소리에서 마케팅의 해답을 찾습니다.</strong><br/>
      D2C Insight Pulse는 LG.com과 Reddit 등 주요 채널의 실사용자 리뷰를 깊이 있게 분석합니다.<br/>
      방대한 데이터 속 숨겨진 인사이트를 발견하고, 즉시 활용 가능한 최적의 마케팅 메시지를 제공하는 데이터 플랫폼입니다.
    </div>
  </div>
  <div style="margin-top:12px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);">
    <div style="font-size:12px;color:rgba(255,255,255,0.85);">${d.dateRange}</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;">Generated: ${d.generatedAt}</div>
  </div>
</td></tr>

<!-- Data Status Bar -->
${dataBarHTML(d)}

<!-- Placeholder for AI insights -->
<tr><td style="padding:20px 28px;">
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
      <div style="font-size:12px;color:#6B6B6B;line-height:1.8;margin-top:8px;">
        리뷰 분석부터 광고 카피까지 — 진짜 고객의 목소리로 증명된 메시지를 만듭니다.<br/>
        실제 사용자 리뷰에서 핵심 인사이트를 추출하고, 그 안에 담긴 감정과 언어를 그대로 마케팅 에셋으로 변환합니다.<br/>
        지금 바로 리뷰가 증명한 메시지로 더 설득력 있는 캠페인을 만들어보세요.
      </div>
      <a href="${BASE_URL}/" style="display:inline-block;margin-top:14px;background:#A50034;color:#fff;border-radius:6px;padding:10px 20px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:600;text-decoration:none;">👉 마케팅 에셋 스튜디오 바로가기</a>
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
