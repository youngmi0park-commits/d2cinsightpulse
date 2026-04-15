import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSourceCounts } from "@/hooks/useProductData";
import { Copy, Check, Eye, Code, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

/* ───── Types ───── */
interface QuickWin {
  label: string; action: string; basis: string; tags: string[]; country: string;
}
interface MatrixItem {
  tag: string; channel: string; country: string; title: string; description: string;
  count: number; countLabel: string; delta: string; deltaPositive: boolean;
}
interface NewsletterData {
  dateRange: string; generatedAt: string;
  weeklyReviews: number; wow: number;
  totalReviews: number; productCount: number;
  channels: { name: string; count: number; color: string }[];
  topPositiveKeyword: string; topPositiveCount: number; topPositiveMeta: string;
  topNegativeKeyword: string; topNegativeCount: number; topNegativeMeta: string;
  topProduct: string; topProductCount: number; topProductKws: string;
  opportunities: { tag: string; title: string; desc: string; count: number; delta: string; country?: string }[];
  trendingSignals: { keyword: string; count: number; delta: number; type: string; sentiment: string; countries?: string[] }[];
  quickWins: QuickWin[];
  matrixItems: MatrixItem[];
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
    queryKey: ["newsletter-v7", sourceCounts],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);
      const dateRange = `${format(weekAgo, "yyyy.MM.dd")} – ${format(now, "yyyy.MM.dd")}`;
      const generatedAt = format(now, "yyyy.MM.dd HH:mm");

      const [weeklyRes, lastWeekRes, totalRes, productRes, keywordsRes, trendingRes] = await Promise.all([
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("published_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }).gte("published_at", twoWeeksAgo.toISOString()).lt("published_at", weekAgo.toISOString()),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("trending_keywords").select("keyword, count, sentiment, change_percent, related_countries, related_products").order("count", { ascending: false }).limit(20),
        supabase.from("trending_snapshots").select("product_id, mention_count, change_percent, trend, source, products!inner(display_name, model_number, is_active)").eq("products.is_active", true).order("mention_count", { ascending: false }).limit(10),
      ]);

      const wow = (lastWeekRes.count || 0) > 0 ? Math.round((((weeklyRes.count || 0) - (lastWeekRes.count || 0)) / (lastWeekRes.count || 1)) * 100) : 0;

      const entries = Object.entries(sourceCounts || {}).sort((a, b) => b[1] - a[1]);
      const topChannels = entries.slice(0, 4).map(([src, cnt]) => {
        const cfg = CHANNEL_COLORS[src] || { label: src, color: "#888", dot: "#888" };
        return { name: cfg.label, count: cnt, color: cfg.dot };
      });
      const otherCount = entries.slice(4).reduce((sum, [, cnt]) => sum + cnt, 0);
      const otherChannelCount = entries.length - 4;
      if (otherCount > 0) {
        topChannels.push({ name: `+${otherChannelCount}개 채널`, count: otherCount, color: "#999" });
      }

      // Category Korean labels
      const CAT_KO: Record<string, string> = {
        TV: "TV", Monitor: "모니터", Refrigerator: "냉장고", Washer: "세탁기",
        Dryer: "건조기", Dishwasher: "식세기", Kitchen: "주방가전", Vacuum: "청소기",
        "Air Conditioner": "에어컨", "Air Care": "공기청정기", "Air Purifier": "공기청정기",
        Soundbar: "사운드바", Audio: "오디오", Projector: "프로젝터", Laptop: "노트북",
        Styler: "스타일러", Microwave: "전자레인지", "Range/Oven": "오븐/레인지",
        Cooktop: "쿡탑", Dehumidifier: "제습기",
      };

      // Fetch product categories for keyword-related products
      const allRelatedProducts = new Set<string>();
      (keywordsRes.data || []).forEach(k => {
        ((k.related_products as string[] | null) || []).forEach((p: string) => allRelatedProducts.add(p));
      });
      const productCatMap: Record<string, string> = {};
      if (allRelatedProducts.size > 0) {
        const { data: prodCats } = await supabase
          .from("products")
          .select("model_number, category")
          .in("model_number", Array.from(allRelatedProducts).slice(0, 50));
        (prodCats || []).forEach((p: any) => { productCatMap[p.model_number] = p.category; });
      }

      const getKwCatLabel = (kw: any) => {
        const relProd = ((kw?.related_products as string[] | null) || [])[0];
        const cat = relProd ? productCatMap[relProd] : undefined;
        return cat ? (CAT_KO[cat] || cat) : "";
      };

      // Keywords
      const kws = keywordsRes.data || [];
      const posKws = kws.filter(k => k.sentiment === "positive").sort((a, b) => b.count - a.count);
      const negKws = kws.filter(k => k.sentiment === "negative").sort((a, b) => b.count - a.count);
      const topPosKw = posKws[0];
      const topPositiveKeyword = topPosKw?.keyword || "—";
      const topPositiveCount = topPosKw?.count || 0;
      const posCatLabel = getKwCatLabel(topPosKw);
      const topPositiveMeta = topPosKw ? [posCatLabel ? `📦 ${posCatLabel}` : "", (topPosKw.related_products as string[] | null)?.[0] || "", (topPosKw.related_countries as string[] | null)?.[0] || ""].filter(Boolean).join(" · ") : "";
      const topNegKw = negKws[0];
      const topNegativeKeyword = topNegKw?.keyword || "—";
      const topNegativeCount = topNegKw?.count || 0;
      const negCatLabel = getKwCatLabel(topNegKw);
      const topNegativeMeta = topNegKw ? [negCatLabel ? `📦 ${negCatLabel}` : "", (topNegKw.related_products as string[] | null)?.[0] || "", (topNegKw.related_countries as string[] | null)?.[0] || ""].filter(Boolean).join(" · ") : "";

      // Top product
      const trendProds = trendingRes.data || [];
      const topProd = trendProds[0];
      const topProduct = (topProd?.products as any)?.display_name || "—";
      const topProductModel = (topProd?.products as any)?.model_number || "";
      const topProductCount = topProd?.mention_count || 0;
      const topProductKws = kws.filter(k => (k.related_products as string[] | null)?.some((p: string) => p.toLowerCase().includes(topProductModel.toLowerCase()))).slice(0, 2).map(k => k.keyword).join(", ");

      // Opportunities (derived from trending)
      const opportunities: NewsletterData["opportunities"] = [];
      for (const tp of trendProds.slice(0, 3)) {
        const prod = tp.products as any;
        const chg = Number(tp.change_percent) || 0;
        const tag = chg > 10 ? "amplify" : chg < -10 ? "fix" : "watch";
        opportunities.push({
          tag,
          title: prod?.display_name || "Unknown",
          desc: tag === "amplify" ? "긍정 트렌드 확산 — 마케팅 소재 활용" : tag === "fix" ? "부정 급증 — CS·PDP 즉시 대응" : "모니터링 필요",
          count: tp.mention_count,
          delta: `${chg > 0 ? "+" : ""}${chg}%`,
          country: tp.source?.includes("reddit") ? "🌐 Global" : "🇺🇸 US",
        });
      }

      // Trending signals
      const trendingSignals: NewsletterData["trendingSignals"] = kws.slice(0, 6).map(k => ({
        keyword: k.keyword,
        count: k.count,
        delta: Number(k.change_percent) || 0,
        type: (Number(k.change_percent) || 0) > 20 ? "rising" : (Number(k.change_percent) || 0) < -20 ? "falling" : "stable",
        sentiment: k.sentiment,
        countries: (k.related_countries as string[] | null)?.length ? (k.related_countries as string[]) : ["Global"],
      }));

      return {
        dateRange, generatedAt,
        weeklyReviews: weeklyRes.count || 0, wow,
        totalReviews: totalRes.count || 0,
        productCount: productRes.count || 0,
        channels: topChannels,
        topPositiveKeyword, topPositiveCount, topPositiveMeta,
        topNegativeKeyword, topNegativeCount, topNegativeMeta,
        topProduct, topProductCount, topProductKws,
        opportunities,
        trendingSignals,
      } as NewsletterData;
    },
    staleTime: 60_000,
  });
}

/* ───── Preview HTML (fallback — no AI) ───── */
function generatePreviewHTML(d: NewsletterData): string {
  const BASE_URL = window.location.origin;
  const FONT = "'Malgun Gothic','Apple SD Gothic Neo','Segoe UI',Arial,sans-serif";
  const INTER = "Inter,'Segoe UI',Arial,sans-serif";
  const WIDTH = 780;
  const BG = "#FFFFFF";
  const CARD_BG = "#FFFFFF";
  const RED = "#EA1917";
  const DARK_RED = "#A50034";
  const BORDER = "#E0DBD3";
  const WARM_BG = "#EFECE5";
  const BOX_BG = "#EFECE5";
  const RADIUS = "border-radius:12px;overflow:hidden;";

  const channelBadges = d.channels.map(ch => {
    return `<td style="padding:0 4px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid ${BORDER};background:${WARM_BG};padding:5px 14px;font-size:12px;color:#555;font-weight:600;font-family:${FONT};border-radius:20px;mso-border-alt:solid ${BORDER} 1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${ch.color};margin-right:5px;vertical-align:middle;"></span>${ch.name} <strong style="color:#333;">${ch.count.toLocaleString()}</strong></td></tr></table></td>`;
  }).join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="ko">
<head><meta charset="UTF-8" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" /><meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<title>RTA Studio Weekly</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}td{border-collapse:collapse;mso-line-height-rule:exactly;}</style><![endif]-->
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
body,table,td,p,a,li{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
@media only screen and (max-width:799px){.email-container{width:100%!important;max-width:100%!important;}}
</style></head>
<body style="margin:0;padding:0;background-color:${BG};font-family:${FONT};word-spacing:normal;">

<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BG};"><tr><td align="center"><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BG};">
<tr><td align="center" style="padding:28px 0;">

<!-- Red top accent bar -->
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${WIDTH}" align="center"><tr><td style="background:${RED};height:5px;font-size:0;line-height:0;">&nbsp;</td></tr></table><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${WIDTH}" class="email-container" style="max-width:${WIDTH}px;">
<tr><td style="background:${RED};height:5px;font-size:0;line-height:0;border-radius:12px 12px 0 0;">&nbsp;</td></tr>
</table>

<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${WIDTH}" align="center" style="width:${WIDTH}px;background-color:${CARD_BG};"><tr><td><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${WIDTH}" class="email-container" style="max-width:${WIDTH}px;background:${CARD_BG};overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.07);">

<!-- Header -->
<tr><td style="padding:30px 40px 20px;border-bottom:2px solid ${BORDER};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td style="font-family:${INTER};">
      <div style="font-size:26px;font-weight:800;color:${RED};letter-spacing:-0.5px;line-height:32px;">Review-to-Asset Studio</div>
      <div style="font-size:12px;color:#888;margin-top:5px;line-height:18px;">Weekly Insight Report &nbsp;·&nbsp; <em style="color:#bbb;">Turn Real Reviews into Ready-to-Use Marketing Assets.</em></div>
    </td>
    <td width="160" style="text-align:right;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right">
        <tr><td style="border:2px solid ${RED};padding:8px 16px;text-align:center;font-family:${INTER};">
          <div style="font-size:10px;font-weight:800;color:${RED};letter-spacing:1.5px;line-height:14px;">WEEKLY REPORT</div>
          <div style="font-size:10px;color:#888;margin-top:4px;line-height:14px;">${d.dateRange}</div>
        </td></tr>
      </table>
    </td>
  </tr></table>
</td></tr>

<!-- Intro with warm beige background -->
<tr><td style="padding:0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${WARM_BG};">
    <tr><td style="padding:20px 40px;font-family:${FONT};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:13px;font-weight:700;color:#333;padding-bottom:6px;line-height:20px;">🎯 고객의 생생한 목소리에서 마케팅의 해답을 찾습니다.</td></tr>
        <tr><td style="font-size:12px;color:#666;line-height:22px;">RTA Studio는 14개국, 43개+ 채널의 실사용자 리뷰를 통합 분석하여 숨겨진 인사이트를 발견하고, 즉시 활용 가능한 마케팅 에셋을 제공하는 올인원 플랫폼입니다.</td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>

<!-- Data Bar -->
<tr><td style="padding:20px 40px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BORDER};background:${BOX_BG};${RADIUS}">
    <tr><td style="padding:14px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:13px;font-weight:700;color:#333;font-family:${FONT};">📊 데이터 수집 현황</td>
        <td style="text-align:right;font-size:12px;color:#666;font-family:${FONT};">
          <strong style="color:${RED};font-size:18px;">${d.totalReviews.toLocaleString()}</strong>
          <span style="color:#888;font-size:12px;">건 · ${d.productCount.toLocaleString()}개 제품</span>
          ${d.wow !== 0 ? `<span style="color:${d.wow > 0 ? '#16a34a' : '#dc2626'};font-size:11px;margin-left:6px;">${d.wow > 0 ? '▲' : '▼'}${Math.abs(d.wow)}% WoW</span>` : ''}
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 20px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${channelBadges}</tr></table>
    </td></tr>
  </table>
</td></tr>

<!-- KPI Pulse Row -->
<tr><td style="padding:20px 40px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td width="25%" style="padding:0 4px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BOX_BG};border:1px solid ${BORDER};${RADIUS}">
          <tr><td style="height:3px;background:${RED};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:14px 12px;text-align:center;height:90px;vertical-align:middle;font-family:${INTER};">
            <div style="font-size:9px;font-weight:700;color:#888;letter-spacing:0.5px;line-height:14px;">총 리뷰 수집</div>
            <div style="font-size:22px;font-weight:800;color:#1a1a1a;line-height:28px;margin-top:4px;">${d.totalReviews.toLocaleString()}</div>
            <div style="font-size:10px;color:${d.wow >= 0 ? '#16a34a' : '#dc2626'};font-weight:600;margin-top:2px;">${d.wow > 0 ? '▲' : d.wow < 0 ? '▼' : ''}${d.wow > 0 ? '+' : ''}${d.wow}% vs 전주</div>
          </td></tr>
        </table>
      </td>
      <td width="25%" style="padding:0 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BOX_BG};border:1px solid ${BORDER};${RADIUS}">
          <tr><td style="height:3px;background:#16a34a;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:14px 12px;text-align:center;height:90px;vertical-align:middle;font-family:${INTER};">
            <div style="font-size:9px;font-weight:700;color:#888;letter-spacing:0.5px;line-height:14px;">긍정 TOP 키워드</div>
            <div style="font-size:14px;font-weight:800;color:#16a34a;line-height:20px;margin-top:6px;">"${d.topPositiveKeyword}"</div>
            <div style="font-size:10px;color:#888;margin-top:2px;">${d.topPositiveCount}건 · ${d.topPositiveMeta || '언급 1위'}</div>
          </td></tr>
        </table>
      </td>
      <td width="25%" style="padding:0 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BOX_BG};border:1px solid ${BORDER};${RADIUS}">
          <tr><td style="height:3px;background:#dc2626;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:14px 12px;text-align:center;height:90px;vertical-align:middle;font-family:${INTER};">
            <div style="font-size:9px;font-weight:700;color:#888;letter-spacing:0.5px;line-height:14px;">부정 TOP 키워드</div>
            <div style="font-size:14px;font-weight:800;color:#dc2626;line-height:20px;margin-top:6px;">"${d.topNegativeKeyword}"</div>
            <div style="font-size:10px;color:#888;margin-top:2px;">${d.topNegativeCount}건 · ${d.topNegativeMeta || 'FAQ 대응 권고'}</div>
          </td></tr>
        </table>
      </td>
      <td width="25%" style="padding:0 0 0 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BOX_BG};border:1px solid ${BORDER};${RADIUS}">
          <tr><td style="height:3px;background:#0D9488;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:14px 12px;text-align:center;height:90px;vertical-align:middle;font-family:${INTER};">
            <div style="font-size:9px;font-weight:700;color:#888;letter-spacing:0.5px;line-height:14px;">주간 언급 TOP</div>
            <div style="font-size:13px;font-weight:800;color:#1a1a1a;line-height:18px;margin-top:6px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${d.topProduct}</div>
            <div style="font-size:10px;color:#888;margin-top:2px;">${d.topProductCount}건 · 1위${d.topProductKws ? ` · ${d.topProductKws}` : ''}</div>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</td></tr>

<!-- Marketing Opportunity Matrix -->
${d.opportunities.length > 0 ? `<tr><td style="padding:20px 40px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BOX_BG};border:1px solid ${BORDER};${RADIUS}">
    <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};background:${WARM_BG};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:12px;font-weight:800;color:#333;font-family:${INTER};">🎯 마케팅 기회 매트릭스</td>
        <td style="text-align:right;font-size:9px;color:#999;font-family:${FONT};">리뷰 인사이트 기반 자동 분류</td>
      </tr></table>
    </td></tr>
    ${d.opportunities.map(op => {
      const tagColor = op.tag === "amplify" ? "#16a34a" : op.tag === "fix" ? "#dc2626" : "#d97706";
      const tagBg = op.tag === "amplify" ? "#f0fdf4" : op.tag === "fix" ? "#fef2f2" : "#fffbeb";
      const tagLabel = op.tag === "amplify" ? "📣 AMPLIFY" : op.tag === "fix" ? "🔧 FIX" : "👀 WATCH";
      const deltaColor = op.delta.startsWith("+") ? "#16a34a" : op.delta.startsWith("-") ? "#dc2626" : "#888";
      return `<tr><td style="padding:0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-bottom:1px solid ${BORDER};">
          <tr>
            <td width="4" style="background:${tagColor};font-size:0;line-height:0;">&nbsp;</td>
            <td style="padding:10px 14px;font-family:${FONT};">
              <div style="margin-bottom:4px;">
                <span style="display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;background:${tagBg};color:${tagColor};border:1px solid ${tagColor}33;">${tagLabel}</span>
                ${op.country ? `<span style="display:inline-block;font-size:9px;font-weight:600;padding:2px 6px;background:#f5f5f4;color:#333;border:1px solid #d4d4d4;margin-left:4px;">${op.country}</span>` : ""}
              </div>
              <div style="font-size:12px;font-weight:700;color:#1a1a1a;line-height:16px;">${op.title}</div>
              <div style="font-size:10px;color:#888;line-height:16px;margin-top:2px;">${op.desc}</div>
            </td>
            <td width="80" style="padding:10px 14px;text-align:right;font-family:${INTER};vertical-align:middle;">
              <div style="font-size:16px;font-weight:800;color:${deltaColor};">${op.count}</div>
              <div style="font-size:9px;color:#888;">건</div>
              <div style="font-size:10px;font-weight:700;color:${deltaColor};margin-top:2px;">${op.delta}</div>
            </td>
          </tr>
        </table>
      </td></tr>`;
    }).join("")}
  </table>
</td></tr>` : ""}

<!-- Trending Signals -->
${d.trendingSignals.length > 0 ? `<tr><td style="padding:20px 40px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BOX_BG};border:1px solid ${BORDER};${RADIUS}">
    <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};background:${WARM_BG};">
      <div style="font-size:12px;font-weight:800;color:#333;font-family:${INTER};">🔥 트렌딩 신호 — 이번 주 주목 키워드</div>
    </td></tr>
    <tr><td style="padding:12px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          ${d.trendingSignals.slice(0, 3).map(sig => {
            const borderColor = sig.type === "rising" ? "#bbf7d0" : sig.type === "falling" ? "#fecaca" : "#e5e7eb";
            const bgColor = sig.type === "rising" ? "#f0fdf4" : sig.type === "falling" ? "#fef2f2" : "#fafafa";
            const badge = sig.type === "rising" ? "📈 급증" : sig.type === "falling" ? "⚠️ 주의" : "— 유지";
            const badgeBg = sig.type === "rising" ? "#dcfce7" : sig.type === "falling" ? "#fee2e2" : "#f3f4f6";
            const badgeColor = sig.type === "rising" ? "#16a34a" : sig.type === "falling" ? "#dc2626" : "#888";
            const valColor = sig.sentiment === "positive" ? "#16a34a" : sig.sentiment === "negative" ? "#dc2626" : "#1a1a1a";
            const deltaColor = sig.delta > 0 ? "#16a34a" : sig.delta < 0 ? "#dc2626" : "#888";
            return `<td width="33%" style="padding:0 4px;vertical-align:top;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${borderColor};background:${bgColor};">
                <tr><td style="padding:10px;font-family:${INTER};">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                    <td style="font-size:13px;font-weight:800;color:#1a1a1a;line-height:16px;">"${sig.keyword}"</td>
                    <td width="50" style="text-align:right;"><span style="font-size:8px;font-weight:700;padding:2px 5px;background:${badgeBg};color:${badgeColor};">${badge}</span></td>
                  </tr></table>
                  <div style="font-size:20px;font-weight:800;color:${valColor};margin-top:6px;">${sig.count}<span style="font-size:10px;color:#888;font-weight:400;"> 건</span></div>
                  <div style="font-size:10px;font-weight:600;color:${deltaColor};margin-top:2px;">${sig.delta > 0 ? "▲ +" + sig.delta : sig.delta < 0 ? "▼ " + sig.delta : "—"}건 vs 전주</div>
                  ${sig.countries?.length ? `<div style="margin-top:4px;">${sig.countries.map(c => `<span style="display:inline-block;font-size:8px;font-weight:600;padding:1px 4px;background:#f5f5f4;color:#333;border:1px solid #d4d4d4;margin-right:2px;">${c}</span>`).join("")}</div>` : ""}
                </td></tr>
              </table>
            </td>`;
          }).join("")}
        </tr>
        ${d.trendingSignals.length > 3 ? `<tr>
          ${d.trendingSignals.slice(3, 6).map(sig => {
            const borderColor = sig.type === "rising" ? "#bbf7d0" : sig.type === "falling" ? "#fecaca" : "#e5e7eb";
            const bgColor = sig.type === "rising" ? "#f0fdf4" : sig.type === "falling" ? "#fef2f2" : "#fafafa";
            const badge = sig.type === "rising" ? "📈 급증" : sig.type === "falling" ? "⚠️ 주의" : "— 유지";
            const badgeBg = sig.type === "rising" ? "#dcfce7" : sig.type === "falling" ? "#fee2e2" : "#f3f4f6";
            const badgeColor = sig.type === "rising" ? "#16a34a" : sig.type === "falling" ? "#dc2626" : "#888";
            const valColor = sig.sentiment === "positive" ? "#16a34a" : sig.sentiment === "negative" ? "#dc2626" : "#1a1a1a";
            const deltaColor = sig.delta > 0 ? "#16a34a" : sig.delta < 0 ? "#dc2626" : "#888";
            return `<td width="33%" style="padding:8px 4px 0;vertical-align:top;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${borderColor};background:${bgColor};">
                <tr><td style="padding:10px;font-family:${INTER};">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                    <td style="font-size:13px;font-weight:800;color:#1a1a1a;line-height:16px;">"${sig.keyword}"</td>
                    <td width="50" style="text-align:right;"><span style="font-size:8px;font-weight:700;padding:2px 5px;background:${badgeBg};color:${badgeColor};">${badge}</span></td>
                  </tr></table>
                  <div style="font-size:20px;font-weight:800;color:${valColor};margin-top:6px;">${sig.count}<span style="font-size:10px;color:#888;font-weight:400;"> 건</span></div>
                  <div style="font-size:10px;font-weight:600;color:${deltaColor};margin-top:2px;">${sig.delta > 0 ? "▲ +" + sig.delta : sig.delta < 0 ? "▼ " + sig.delta : "—"}건 vs 전주</div>
                  ${sig.countries?.length ? `<div style="margin-top:4px;">${sig.countries.map(c => `<span style="display:inline-block;font-size:8px;font-weight:600;padding:1px 4px;background:#f5f5f4;color:#333;border:1px solid #d4d4d4;margin-right:2px;">${c}</span>`).join("")}</div>` : ""}
                </td></tr>
              </table>
            </td>`;
          }).join("")}
          ${d.trendingSignals.slice(3, 6).length < 3 ? `<td width="${33 * (3 - d.trendingSignals.slice(3, 6).length)}%"></td>` : ""}
        </tr>` : ""}
      </table>
    </td></tr>
  </table>
</td></tr>` : ""}

<!-- Placeholder for AI insights -->
<tr><td style="padding:24px 40px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:2px dashed ${BORDER};background:${BOX_BG};${RADIUS}">
    <tr><td style="text-align:center;padding:48px 24px;color:#999;font-size:14px;font-family:${FONT};">
      🚀 <strong style="color:#555;">원클릭 생성</strong> 버튼을 눌러 AI 기반 주간 인사이트를 생성하세요
    </td></tr>
  </table>
</td></tr>

<!-- CTA Banner -->
<tr><td style="padding:0 40px 28px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BOX_BG};border:1px solid ${BORDER};${RADIUS}">
    <tr><td colspan="3" style="height:4px;background:${RED};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr>
      <td width="200" style="padding:24px 20px;vertical-align:middle;">
        <table role="presentation" cellpadding="0" cellspacing="5" border="0"><tr>
          <td width="58" height="52" style="background:${WARM_BG};border:1px solid ${BORDER};text-align:center;vertical-align:middle;font-family:${FONT};"><div style="font-size:18px;">📊</div><div style="font-size:8px;color:#999;">리뷰 분석</div></td>
          <td width="58" height="52" style="background:${WARM_BG};border:1px solid ${BORDER};text-align:center;vertical-align:middle;font-family:${FONT};"><div style="font-size:18px;">⚡</div><div style="font-size:8px;color:#999;">광고 카피</div></td>
          <td width="58" height="52" style="background:${WARM_BG};border:1px solid ${BORDER};text-align:center;vertical-align:middle;font-family:${FONT};"><div style="font-size:18px;">❓</div><div style="font-size:8px;color:#999;">FAQ</div></td>
        </tr></table>
      </td>
      <td width="1" style="padding:14px 0;vertical-align:middle;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:1px;height:74px;background:${BORDER};font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
      <td style="padding:24px 28px;vertical-align:middle;font-family:${FONT};">
        <div style="font-family:${INTER};font-size:14px;font-weight:700;color:#888;line-height:20px;">Marketing Asset Studio</div>
        <div style="font-family:${INTER};font-size:22px;font-weight:800;color:#1A1A1A;letter-spacing:-0.3px;line-height:28px;margin-top:3px;">Review-to-Asset,<br/><span style="color:${RED};">Instantly.</span></div>
        <div style="font-size:12px;color:#888;line-height:20px;margin-top:8px;">광고 카피부터 이미지 에셋까지 —<br/>리뷰가 증명한 메시지로 만듭니다.</div>
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${BASE_URL}/" style="height:36px;v-text-anchor:middle;width:200px;" arcsize="15%" fillcolor="${RED}" stroke="f"><center style="color:#ffffff;font-family:${INTER};font-size:12px;font-weight:600;">마케팅 에셋 스튜디오 바로가기 →</center></v:roundrect><![endif]-->
        <!--[if !mso]><!--><a href="${BASE_URL}/" style="display:inline-block;margin-top:12px;background:${RED};color:#fff;border-radius:20px;padding:10px 24px;font-family:${INTER};font-size:12px;font-weight:700;text-decoration:none;">마케팅 에셋 스튜디오 바로가기 →</a><!--<![endif]-->
      </td>
    </tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="background:${WARM_BG};padding:0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="padding:20px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-family:${INTER};"><div style="font-size:12px;font-weight:700;color:#1a1a1a;line-height:18px;">Review-to-Asset Studio</div><div style="font-size:10px;color:#999;margin-top:3px;line-height:15px;">Produced by LG전자 D2C마케팅전략팀</div></td>
        <td style="text-align:right;font-family:${FONT};"><div style="font-size:10px;color:#bbb;line-height:15px;">본 뉴스레터는 사내 배포용으로<br/>외부 공유를 금합니다.</div></td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</body></html>`;
}

/**
 * Copy HTML to clipboard so it can be pasted directly into Outlook
 * as a rich-text email body (preserving layout).
 * Uses Clipboard API with text/html MIME type for Outlook compatibility.
 */
async function copyHtmlForOutlook(html: string): Promise<boolean> {
  try {
    // Method 1: Clipboard API with HTML blob (best for Outlook paste)
    const blob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([html], { type: "text/plain" });
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": blob,
        "text/plain": textBlob,
      }),
    ]);
    return true;
  } catch {
    // Fallback: plain text copy
    try {
      await navigator.clipboard.writeText(html);
      return true;
    } catch {
      return false;
    }
  }
}

/* ───── Component ───── */
export function WeeklyNewsletterHTML() {
  const { data, isLoading } = useNewsletterData();
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");
  const [copied, setCopied] = useState(false);
  const [copiedRich, setCopiedRich] = useState(false);
  const [fullGenLoading, setFullGenLoading] = useState(false);
  const [fullGenHtml, setFullGenHtml] = useState<string | null>(null);

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

  /* Copy raw HTML source code */
  const handleCopySource = () => {
    const target = fullGenHtml || (data ? generatePreviewHTML(data) : "");
    navigator.clipboard.writeText(target);
    setCopied(true);
    toast.success("📋 HTML 소스코드가 클립보드에 복사되었습니다!");
    setTimeout(() => setCopied(false), 2000);
  };

  /* Copy as rich HTML for Outlook paste (Ctrl+V directly into email body) */
  const handleCopyForOutlook = async () => {
    const target = fullGenHtml || (data ? generatePreviewHTML(data) : "");
    const ok = await copyHtmlForOutlook(target);
    if (ok) {
      setCopiedRich(true);
      toast.success("📧 Outlook 붙여넣기용 HTML이 복사되었습니다!\nOutlook 새 메일 → 본문 클릭 → Ctrl+V로 붙여넣으세요.");
      setTimeout(() => setCopiedRich(false), 3000);
    } else {
      toast.error("복사 실패 — 브라우저 권한을 확인해 주세요.");
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
          <div className="flex items-center gap-2 flex-wrap">
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
                <Button
                  onClick={handleCopyForOutlook}
                  size="sm"
                  variant="default"
                  className="gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white"
                >
                  {copiedRich ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedRich ? "복사 완료!" : "📧 Outlook 붙여넣기용 복사"}
                </Button>
                <Button onClick={handleCopySource} size="sm" variant="outline" className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
                  {copied ? "복사 완료!" : "HTML 소스 복사"}
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

        {/* Outlook paste guide */}
        {fullGenHtml && (
          <div className="mt-3 p-3 bg-[#0078D4]/5 border border-[#0078D4]/20 rounded-lg">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-[#0078D4]">📧 Outlook 발송 방법:</strong>{" "}
              <span className="text-foreground font-medium">「Outlook 붙여넣기용 복사」</span> 클릭 →
              Outlook 새 메일 작성 → 본문 영역 클릭 → <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">Ctrl+V</kbd> →
              레이아웃이 그대로 유지된 채 붙여넣어집니다.
            </p>
          </div>
        )}
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
