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
interface TopTopic { rank: number; topic: string; mention_pct: number; positive_pct: number; negative_pct: number; representative_comment: string; related_products: string[]; }
interface UrgentIssue { rank: number; issue: string; mention_pct: number; pattern: string; cause: string; related_products: string[]; }
interface ChannelOverview { top_topics: TopTopic[]; urgent_issues: UrgentIssue[]; recurring_praise: string[]; unmatched_praise: string[]; }

interface ChannelProduct { name: string; subCategory: string; category: string; posCount: number; negCount: number; posKeywords: string[]; negKeywords: string[]; posSamples: string[]; negSamples: string[]; }

interface NewsletterData {
  dateRange: string; generatedAt: string;
  totalReviews: number; weeklyReviews: number;
  lgcomCount: number; redditCount: number; communityCount: number; wow: number;
  lgcomProducts: ChannelProduct[];
  redditProducts: ChannelProduct[];
  lgcomSentiment: { posPct: number; negPct: number; neutralPct: number; total: number };
  redditSentiment: { posPct: number; negPct: number; neutralPct: number; total: number };
}

/* ───── Data hook ───── */
function useNewsletterData() {
  const { data: sourceCounts } = useSourceCounts();
  return useQuery({
    queryKey: ["newsletter-v4", sourceCounts],
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

      // Channel reviews with content
      const [lgcomRes, redditRes] = await Promise.all([
        supabase.from("reviews")
          .select("product_id, sentiment, title, content, products!inner(display_name, category, sub_category)")
          .like("source", "lge_com%")
          .gte("collected_at", weekAgo.toISOString())
          .limit(1000),
        supabase.from("reviews")
          .select("product_id, sentiment, title, content, products!inner(display_name, category, sub_category)")
          .eq("source", "reddit")
          .gte("collected_at", weekAgo.toISOString())
          .limit(1000),
      ]);

      function buildChannelProducts(reviews: any[]): ChannelProduct[] {
        const map: Record<string, any> = {};
        for (const r of reviews) {
          const pid = r.product_id;
          if (!map[pid]) {
            map[pid] = {
              name: r.products.display_name, subCategory: r.products.sub_category || "",
              category: r.products.category, posCount: 0, negCount: 0,
              posKeywords: [] as string[], negKeywords: [] as string[],
              posSamples: [] as string[], negSamples: [] as string[],
            };
          }
          const p = map[pid];
          if (r.sentiment === "positive") {
            p.posCount++;
            if (r.title && p.posKeywords.length < 5 && !p.posKeywords.includes(r.title)) p.posKeywords.push(r.title);
            if (r.content && p.posSamples.length < 2) {
              const snip = r.content.replace(/\*+/g, "").slice(0, 120);
              if (snip.length > 15) p.posSamples.push(snip);
            }
          }
          if (r.sentiment === "negative") {
            p.negCount++;
            if (r.title && p.negKeywords.length < 5 && !p.negKeywords.includes(r.title)) p.negKeywords.push(r.title);
            if (r.content && p.negSamples.length < 2) {
              const snip = r.content.replace(/\*+/g, "").slice(0, 120);
              if (snip.length > 15) p.negSamples.push(snip);
            }
          }
        }
        return Object.values(map).sort((a, b) => (b.posCount + b.negCount) - (a.posCount + a.negCount)).slice(0, 5);
      }

      function buildSentiment(reviews: any[]) {
        const total = reviews.length;
        const pos = reviews.filter((r: any) => r.sentiment === "positive").length;
        const neg = reviews.filter((r: any) => r.sentiment === "negative").length;
        return { total, posPct: total > 0 ? Math.round((pos / total) * 100) : 0, negPct: total > 0 ? Math.round((neg / total) * 100) : 0, neutralPct: total > 0 ? Math.round(((total - pos - neg) / total) * 100) : 0 };
      }

      return {
        dateRange, generatedAt,
        totalReviews: totalRes.count || 0, weeklyReviews: weeklyRes.count || 0,
        lgcomCount, redditCount, communityCount, wow,
        lgcomProducts: buildChannelProducts(lgcomRes.data || []),
        redditProducts: buildChannelProducts(redditRes.data || []),
        lgcomSentiment: buildSentiment(lgcomRes.data || []),
        redditSentiment: buildSentiment(redditRes.data || []),
      } as NewsletterData;
    },
    staleTime: 60_000,
  });
}

/* ───── HTML Generator ───── */
function generateNewsletterHTML(d: NewsletterData, lgcom: ChannelOverview | null, reddit: ChannelOverview | null): string {
  const wowColor = d.wow >= 0 ? "#22c55e" : "#ef4444";
  const wowSign = d.wow >= 0 ? "+" : "";
  const BASE_URL = window.location.origin;

  function channelProductsHTML(label: string, emoji: string, _products: ChannelProduct[], sentiment: { posPct: number; negPct: number; neutralPct: number; total: number }) {
    return `
    <tr><td style="padding:20px 28px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:8px;border-left:3px solid #A51C30;padding-left:8px;">${emoji} ${label} 주간 리뷰 요약</div>
      <div style="margin-bottom:12px;">
        <div style="font-size:12px;color:#444;margin-bottom:6px;">전체 ${sentiment.total.toLocaleString()}건</div>
        <div style="background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden;margin-bottom:4px;">
          <div style="background:#22c55e;height:8px;width:${sentiment.posPct}%;display:inline-block;float:left;"></div>
          <div style="background:#ef4444;height:8px;width:${sentiment.negPct}%;display:inline-block;float:left;"></div>
        </div>
        <div style="font-size:10px;color:#888;">긍정 ${sentiment.posPct}% · 중립 ${sentiment.neutralPct}% · 부정 ${sentiment.negPct}%</div>
      </div>
    </td></tr>`;
  }

  function overviewHTML(label: string, emoji: string, overview: ChannelOverview | null) {
    if (!overview) return `
    <tr><td style="padding:20px 28px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:8px;border-left:3px solid #A51C30;padding-left:8px;">${emoji} ${label} AI 오버뷰</div>
      <div style="text-align:center;padding:20px;color:#999;font-size:12px;border:1px dashed #e5e7eb;border-radius:8px;">AI 오버뷰를 생성해주세요</div>
    </td></tr>`;

    const topics = (overview.top_topics || []).map(t => `
      <tr><td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;">
        <div style="font-weight:600;font-size:12px;color:#1a1a1a;margin-bottom:3px;">${t.rank}. ${t.topic}</div>
        <div style="font-size:10px;color:#888;margin-bottom:3px;">언급 ${t.mention_pct}% · <span style="color:#22c55e">긍정 ${t.positive_pct}%</span> · <span style="color:#ef4444">부정 ${t.negative_pct}%</span></div>
        <div style="font-size:10px;color:#555;font-style:italic;background:#f9fafb;padding:5px 8px;border-radius:4px;margin-bottom:3px;">"${t.representative_comment}"</div>
        <div style="font-size:9px;color:#aaa;">${(t.related_products || []).map(p => `<span style="background:#f3f4f6;padding:1px 5px;border-radius:3px;margin-right:3px;">${p}</span>`).join("")}</div>
      </td></tr>`).join("");

    const issues = (overview.urgent_issues || []).map(iss => `
      <tr><td style="padding:8px 14px;border-bottom:1px solid #fecaca;">
        <div style="font-weight:600;font-size:12px;color:#dc2626;margin-bottom:3px;">${iss.rank}. ${iss.issue} (${iss.mention_pct}%)</div>
        <div style="font-size:10px;color:#666;"><strong>패턴:</strong> ${iss.pattern}</div>
        <div style="font-size:10px;color:#444;"><strong>원인:</strong> ${iss.cause}</div>
      </td></tr>`).join("");

    const praise = (overview.recurring_praise || []).map(p => `<div style="padding:2px 0;font-size:11px;color:#15803d;">✅ ${p}</div>`).join("");
    const unmatched = (overview.unmatched_praise || []).map(p => `<div style="padding:2px 0;font-size:11px;color:#b45309;font-style:italic;">⭐ ${p}</div>`).join("");

    return `
    <tr><td style="padding:20px 28px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:8px;border-left:3px solid #A51C30;padding-left:8px;">${emoji} ${label} AI 오버뷰</div>
      <div style="font-size:10px;font-weight:600;color:#555;margin-bottom:4px;">🔥 고객 주요 주제</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:12px;">${topics}</table>
      ${issues ? `<div style="font-size:10px;font-weight:600;color:#dc2626;margin-bottom:4px;">⚠️ 개선 시급 이슈</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;background:#fffbfb;margin-bottom:12px;">${issues}</table>` : ""}
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="48%" valign="top" style="border:1px solid #bbf7d0;border-radius:8px;padding:10px;background:#f0fdf4;">
          <div style="font-size:9px;font-weight:700;color:#15803d;text-transform:uppercase;margin-bottom:6px;">✅ 반복 칭찬</div>${praise || '<div style="font-size:10px;color:#aaa;">—</div>'}
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top" style="border:1px solid #fde68a;border-radius:8px;padding:10px;background:#fffbeb;">
          <div style="font-size:9px;font-weight:700;color:#b45309;text-transform:uppercase;margin-bottom:6px;">⭐ 절대적 칭찬</div>${unmatched || '<div style="font-size:10px;color:#aaa;">—</div>'}
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

<!-- Header with Brand Intro -->
<tr><td style="background:linear-gradient(135deg,#A51C30,#7a1424);padding:32px 28px;text-align:center;">
  <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:4px;">D2C Insight Pulse</div>
  <div style="font-size:12px;color:rgba(255,255,255,0.7);font-style:italic;margin-bottom:12px;">Feel the Pulse. Gain the Insight.</div>
  <div style="font-size:11px;color:rgba(255,255,255,0.9);line-height:1.7;max-width:520px;margin:0 auto;">
    <strong style="color:#fff;">고객의 생생한 목소리에서 마케팅의 해답을 찾습니다.</strong><br/>
    D2C Insight Pulse는 LG.com과 Reddit 등 주요 채널의 실사용자 리뷰를 깊이 있게 분석합니다.<br/>
    방대한 데이터 속 숨겨진 인사이트를 발견하고, 즉시 활용 가능한 최적의 마케팅 메시지를 제공하는 데이터 플랫폼입니다.
  </div>
  <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.15);">
    <div style="font-size:10px;letter-spacing:2px;color:rgba(255,255,255,0.5);text-transform:uppercase;">Weekly Overview Report</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">${d.dateRange}</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;">Generated: ${d.generatedAt}</div>
  </div>
</td></tr>

<!-- KPI -->
<tr><td style="padding:20px 28px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#A51C30;text-transform:uppercase;margin-bottom:10px;border-left:3px solid #A51C30;padding-left:8px;">📊 KPI Summary</div>
  <table cellpadding="0" cellspacing="4" border="0" width="100%"><tr>
    <td width="25%" style="text-align:center;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;">Weekly Total</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin:2px 0;">${d.weeklyReviews.toLocaleString()}</div>
      <div style="font-size:11px;color:${wowColor};font-weight:600;">${wowSign}${d.wow}% WoW</div>
      <div style="font-size:9px;color:#aaa;">누적 ${d.totalReviews.toLocaleString()}건</div>
    </td>
    <td width="25%" style="text-align:center;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;">LG.com</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin:2px 0;">${d.lgcomCount.toLocaleString()}</div>
      <div style="font-size:9px;color:#aaa;">누적</div>
    </td>
    <td width="25%" style="text-align:center;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;">Reddit</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin:2px 0;">${d.redditCount.toLocaleString()}</div>
      <div style="font-size:9px;color:#aaa;">누적</div>
    </td>
    <td width="25%" style="text-align:center;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:9px;color:#999;text-transform:uppercase;">Community</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin:2px 0;">${d.communityCount.toLocaleString()}</div>
      <div style="font-size:9px;color:#aaa;">타채널</div>
    </td>
  </tr></table>
</td></tr>

<!-- LG.com Weekly Review Summary -->
${channelProductsHTML("LG.COM", "🏪", d.lgcomProducts, d.lgcomSentiment)}

<!-- Reddit Weekly Review Summary -->
${channelProductsHTML("REDDIT", "💬", d.redditProducts, d.redditSentiment)}

<!-- LG.com AI Overview -->
${overviewHTML("LG.COM", "🏪", lgcom)}

<!-- Reddit AI Overview -->
${overviewHTML("REDDIT", "💬", reddit)}

<!-- Review-to-Asset CTA Banner -->
<tr><td style="padding:24px 28px 0;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E0DBD3;border-radius:14px;overflow:hidden;">
    <tr><td colspan="3" style="height:4px;background:#A50034;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr>
      <td style="padding:20px 18px;vertical-align:middle;" width="140">
        <table cellpadding="0" cellspacing="6" border="0"><tr>
          <td style="width:58px;height:52px;background:#F7F4EF;border:1px solid #E8E4DC;border-radius:8px;text-align:center;vertical-align:middle;">
            <div style="font-size:18px;line-height:1;">📊</div>
            <div style="font-family:Inter,Arial,sans-serif;font-size:8px;color:#999999;margin-top:2px;">리뷰 분석</div>
          </td>
          <td style="width:58px;height:52px;background:#F7F4EF;border:1px solid #E8E4DC;border-radius:8px;text-align:center;vertical-align:middle;">
            <div style="font-size:18px;line-height:1;">⚡</div>
            <div style="font-family:Inter,Arial,sans-serif;font-size:8px;color:#999999;margin-top:2px;">광고 카피</div>
          </td>
          <td style="width:58px;height:52px;background:#F7F4EF;border:1px solid #E8E4DC;border-radius:8px;text-align:center;vertical-align:middle;">
            <div style="font-size:18px;line-height:1;">❓</div>
            <div style="font-family:Inter,Arial,sans-serif;font-size:8px;color:#999999;margin-top:2px;">FAQ</div>
          </td>
        </tr></table>
      </td>
      <td style="width:1px;padding:12px 0;vertical-align:middle;">
        <div style="width:1px;height:80px;background:#E8E4DC;"></div>
      </td>
      <td style="padding:20px 22px;vertical-align:middle;">
        <div style="font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:800;color:#1A1A1A;letter-spacing:-0.3px;line-height:1.3;">Review-to-Asset, <span style="color:#A50034;">Instantly.</span></div>
        <div style="font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:400;color:#6B6B6B;line-height:1.7;margin-top:8px;">리뷰 분석부터 광고 카피까지 — 리뷰가 증명한 메시지로 만듭니다.</div>
        <a href="${BASE_URL}/" style="display:inline-block;margin-top:14px;border:1.5px solid #1A1A1A;color:#1A1A1A;background:transparent;border-radius:7px;padding:9px 18px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">마케팅 에셋 스튜디오 바로가기 →</a>
      </td>
    </tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 28px;">
  <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
    <div style="font-size:11px;color:#999;">D2C Insight Pulse — Powered LG전자 D2C마케팅전략팀</div>
    <div style="font-size:10px;color:#ccc;margin-top:6px;">본 뉴스레터는 사내 배포용으로 외부 공유를 금합니다.</div>
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

  /** 원클릭: AI 오버뷰 포함된 전체 뉴스레터 HTML 서버 생성 */
  const generateFullNewsletter = async () => {
    setFullGenLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("serve-newsletter", {
        body: { format: "json", baseUrl: window.location.origin },
      });
      if (error) throw error;
      if (result?.html) {
        setFullGenHtml(result.html);
        toast.success("✅ AI 오버뷰 포함 뉴스레터가 생성되었습니다!");
      }
    } catch (err: any) {
      toast.error("뉴스레터 생성 실패: " + (err.message || "Unknown"));
    } finally {
      setFullGenLoading(false);
    }
  };

  /** 클립보드 복사 */
  const handleCopy = () => {
    const target = fullGenHtml || (data ? generateNewsletterHTML(data, null, null) : "");
    navigator.clipboard.writeText(target);
    setCopied(true);
    toast.success("📋 뉴스레터 HTML이 클립보드에 복사되었습니다!");
    setTimeout(() => setCopied(false), 2000);
  };

  /** 테스트 메일 발송 */
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

  const html = generateNewsletterHTML(data, null, null);

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
            {/* 원클릭 생성 */}
            <Button
              onClick={generateFullNewsletter}
              disabled={fullGenLoading}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-primary to-primary/80"
            >
              {fullGenLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              {fullGenLoading ? "AI 생성 중..." : fullGenHtml ? "✅ 생성 완료" : "🚀 원클릭 생성"}
            </Button>

            {/* 생성 후 표시: 복사 + 테스트 발송 */}
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
