import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChannelInsight {
  top_products: { rank: number; name: string; category: string; mention_count: number; pos_summary: string; neg_summary: string; praise_points: string[] }[];
  top_topics: { rank: number; topic: string; mention_pct: number; positive_pct: number; negative_pct: number; representative_comment: string; related_products: string[] }[];
  urgent_issues: { rank: number; issue: string; mention_pct: number; pattern: string; cause: string; related_products: string[] }[];
  recurring_praise: string[];
}

/* ── AI insight generation per channel ── */
async function generateChannelInsight(sb: any, lovableApiKey: string, channel: "lgcom" | "reddit"): Promise<ChannelInsight | null> {
  let query = sb
    .from("reviews")
    .select("title, content, sentiment, sentiment_score, rating, source, products!inner(display_name, model_number, category, sub_category)")
    .order("collected_at", { ascending: false })
    .limit(800);

  if (channel === "lgcom") query = query.like("source", "lge_com%");
  else query = query.eq("source", "reddit");

  const { data: reviews, error } = await query;
  if (error || !reviews?.length) return null;

  const posReviews = reviews.filter((r: any) => r.sentiment === "positive");
  const negReviews = reviews.filter((r: any) => r.sentiment === "negative");

  const productMap: Record<string, any> = {};
  for (const r of reviews as any[]) {
    const pName = r.products?.display_name || "Unknown";
    if (!productMap[pName]) {
      productMap[pName] = { name: pName, model: r.products?.model_number || "", category: r.products?.category || "", subCategory: r.products?.sub_category || "", pos: 0, neg: 0, posTitles: [] as string[], negTitles: [] as string[], posContent: [] as string[], negContent: [] as string[] };
    }
    const p = productMap[pName];
    if (r.sentiment === "positive") {
      p.pos++;
      if (r.title && p.posTitles.length < 8) p.posTitles.push(r.title);
      if (r.content && p.posContent.length < 3) p.posContent.push(r.content.slice(0, 150));
    }
    if (r.sentiment === "negative") {
      p.neg++;
      if (r.title && p.negTitles.length < 8) p.negTitles.push(r.title);
      if (r.content && p.negContent.length < 3) p.negContent.push(r.content.slice(0, 150));
    }
  }

  const topProducts = Object.values(productMap).sort((a: any, b: any) => (b.pos + b.neg) - (a.pos + a.neg)).slice(0, 10);
  const productSummary = topProducts.map((p: any) =>
    `${p.name} (${p.category}): 총 ${p.pos + p.neg}건, 긍정 ${p.pos}건, 부정 ${p.neg}건\n  긍정키워드: ${p.posTitles.slice(0, 5).join(", ")}\n  부정키워드: ${p.negTitles.slice(0, 5).join(", ")}\n  긍정리뷰 예시: ${p.posContent.slice(0, 2).join(" | ")}\n  부정리뷰 예시: ${p.negContent.slice(0, 2).join(" | ")}`
  ).join("\n\n");

  const channelLabel = channel === "lgcom" ? "LG.com 공식 리뷰" : "Reddit 및 커뮤니티";

  const systemPrompt = `You are an expert consumer insight analyst for LG Electronics D2C marketing team. Analyze ${channelLabel} data and provide structured weekly insight in Korean. Be specific, actionable, and use real product names from the data.`;

  const userPrompt = `다음은 ${channelLabel}의 최근 수집된 리뷰 데이터입니다:

총 리뷰: ${reviews.length}건 (긍정 ${posReviews.length}건, 부정 ${negReviews.length}건)

제품별 현황:
${productSummary}

위 데이터를 분석하여 아래 4가지 섹션을 **한국어로** 작성해주세요:

## 1. 가장 많이 언급된 제품 TOP 5 (top_products)
각 제품별:
- rank (순위), name (제품명), category, mention_count (언급 수)
- pos_summary: 긍정 코멘트 요약 (2~3문장, 한국어, 실사용자 키워드 포함)
- neg_summary: 부정 코멘트 요약 (2~3문장, 한국어, 없으면 "특이 불만 없음")
- praise_points: 반복 칭찬 포인트 배열 (3~5개, 한국어)

## 2. 고객이 가장 많이 말하는 5가지 주제 (top_topics)
각 주제별:
- rank, topic (구체적 주제명, 한국어), mention_pct (%), positive_pct (%), negative_pct (%)
- representative_comment (대표 코멘트 1줄 한국어 요약)
- related_products (관련 제품명 리스트)

## 3. 개선 시급 이슈 TOP 3 (urgent_issues)
- rank, issue (한국어), mention_pct (%), pattern (패턴 한국어), cause (원인 추정 한국어), related_products

## 4. 반복 칭찬 포인트 5개 (recurring_praise)
- 한국어 문장 배열

JSON 형식으로 응답: { "top_products": [...], "top_topics": [...], "urgent_issues": [...], "recurring_praise": [...] }`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) return null;
  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(content); } catch { return null; }
}

/* ── Newsletter HTML builder ── */
function buildNewsletterHTML(d: {
  dateRange: string; generatedAt: string;
  weeklyReviews: number; wow: number;
  totalReviews: number; productCount: number;
  channels: { name: string; count: number; color: string }[];
}, lgcom: ChannelInsight | null, reddit: ChannelInsight | null, baseUrl: string): string {
  const wowColor = d.wow >= 0 ? "#006600" : "#A50034";
  const wowSign = d.wow >= 0 ? "+" : "";

  function channelSectionHTML(label: string, icon: string, insight: ChannelInsight | null) {
    if (!insight) return `
    <tr><td style="padding:20px 28px 0;">
      <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#A50034;text-transform:uppercase;margin-bottom:8px;border-left:4px solid #A50034;padding-left:10px;">${icon} ${label}</div>
      <div style="text-align:center;padding:24px;color:#999;font-size:12px;border:1.5px dashed #E0DBD3;border-radius:8px;background:#F7F4EF;">데이터 없음</div>
    </td></tr>`;

    // Top products with Korean summaries
    const productsHTML = (insight.top_products || []).slice(0, 5).map(p => `
      <tr><td style="padding:10px 14px;border-bottom:1px solid #F0ECE4;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="28" valign="top" style="padding-top:2px;">
            <div style="width:22px;height:22px;background:#A50034;border-radius:50%;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;">${p.rank}</div>
          </td>
          <td style="padding-left:10px;">
            <div style="font-weight:700;font-size:13px;color:#1a1a1a;margin-bottom:2px;">${p.name}</div>
            <div style="font-size:10px;color:#888;margin-bottom:6px;">${p.category} · 언급 ${p.mention_count}건</div>
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:8px 10px;margin-bottom:4px;">
              <div style="font-size:9px;font-weight:700;color:#006600;text-transform:uppercase;margin-bottom:3px;">👍 긍정 요약</div>
              <div style="font-size:11px;color:#1a1a1a;line-height:1.5;">${p.pos_summary}</div>
            </div>
            ${p.neg_summary && p.neg_summary !== "특이 불만 없음" ? `
            <div style="background:#FFF5F5;border:1px solid #FECACA;border-radius:6px;padding:8px 10px;margin-bottom:4px;">
              <div style="font-size:9px;font-weight:700;color:#A50034;text-transform:uppercase;margin-bottom:3px;">👎 부정 요약</div>
              <div style="font-size:11px;color:#1a1a1a;line-height:1.5;">${p.neg_summary}</div>
            </div>` : ""}
            ${(p.praise_points || []).length > 0 ? `
            <div style="margin-top:4px;">${p.praise_points.map(pp => `<span style="display:inline-block;background:#F7F4EF;border:1px solid #E0DBD3;border-radius:4px;padding:2px 8px;font-size:10px;color:#555;margin:2px 3px 2px 0;">✅ ${pp}</span>`).join("")}</div>` : ""}
          </td>
        </tr></table>
      </td></tr>`).join("");

    // Top 5 topics
    const topicsHTML = (insight.top_topics || []).map(t => `
      <tr><td style="padding:8px 14px;border-bottom:1px solid #F0ECE4;">
        <div style="font-weight:600;font-size:12px;color:#1a1a1a;margin-bottom:3px;">${t.rank}. ${t.topic}</div>
        <div style="font-size:10px;color:#888;margin-bottom:3px;">
          언급 ${t.mention_pct}% · <span style="color:#006600;font-weight:600;">긍정 ${t.positive_pct}%</span> · <span style="color:#A50034;font-weight:600;">부정 ${t.negative_pct}%</span>
        </div>
        <div style="font-size:10px;color:#555;font-style:italic;background:#F7F4EF;padding:5px 8px;border-radius:4px;">"${t.representative_comment}"</div>
        <div style="margin-top:3px;font-size:9px;color:#aaa;">${(t.related_products || []).map(p => `<span style="background:#F0ECE4;padding:1px 5px;border-radius:3px;margin-right:3px;">${p}</span>`).join("")}</div>
      </td></tr>`).join("");

    // Urgent issues TOP 3
    const issuesHTML = (insight.urgent_issues || []).map(iss => `
      <tr><td style="padding:8px 14px;border-bottom:1px solid #FECACA;">
        <div style="font-weight:600;font-size:12px;color:#A50034;margin-bottom:3px;">⚠️ ${iss.rank}. ${iss.issue} <span style="color:#888;font-weight:400;">(${iss.mention_pct}%)</span></div>
        <div style="font-size:10px;color:#666;margin-bottom:2px;"><strong>패턴:</strong> ${iss.pattern}</div>
        <div style="font-size:10px;color:#444;"><strong>원인:</strong> ${iss.cause}</div>
      </td></tr>`).join("");

    // Recurring praise
    const praiseHTML = (insight.recurring_praise || []).map(p => `<div style="padding:3px 0;font-size:11px;color:#006600;line-height:1.5;">✅ ${p}</div>`).join("");

    return `
    <tr><td style="padding:24px 28px 0;">
      <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#A50034;text-transform:uppercase;margin-bottom:14px;border-left:4px solid #A50034;padding-left:10px;">${icon} ${label}</div>

      <!-- Top Products -->
      <div style="font-size:11px;font-weight:700;color:#333;margin-bottom:6px;">📦 가장 많이 언급된 제품</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;border-radius:8px;overflow:hidden;margin-bottom:16px;">${productsHTML}</table>

      <!-- Top 5 Topics -->
      <div style="font-size:11px;font-weight:700;color:#333;margin-bottom:6px;">🔥 주요 키워드 & 주제 TOP 5</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;border-radius:8px;overflow:hidden;margin-bottom:16px;">${topicsHTML}</table>

      <!-- Urgent Issues -->
      ${issuesHTML ? `
      <div style="font-size:11px;font-weight:700;color:#A50034;margin-bottom:6px;">🚨 개선 시급 이슈 TOP 3</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #FECACA;border-radius:8px;overflow:hidden;background:#FFFBFB;margin-bottom:16px;">${issuesHTML}</table>` : ""}

      <!-- Recurring Praise -->
      ${praiseHTML ? `
      <div style="border:1px solid #BBF7D0;border-radius:8px;padding:12px 14px;background:#F0FDF4;margin-bottom:8px;">
        <div style="font-size:10px;font-weight:700;color:#006600;text-transform:uppercase;margin-bottom:6px;">🏆 반복 칭찬 포인트</div>
        ${praiseHTML}
      </div>` : ""}
    </td></tr>`;
  }

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
      <table cellpadding="0" cellspacing="0" border="0"><tr>${d.channels.map(ch => {
        if (ch.name === "LG.com") {
          return `<td style="padding:0 4px;"><div style="display:inline-block;background:#A50034;color:#fff;border-radius:14px;padding:4px 12px;font-size:11px;font-weight:700;white-space:nowrap;">${ch.name} ${ch.count.toLocaleString()}</div></td>`;
        }
        return `<td style="padding:0 4px;"><div style="display:inline-block;border:1px solid #E0DBD3;border-radius:14px;padding:4px 10px;font-size:11px;color:#444;white-space:nowrap;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${ch.color};margin-right:4px;vertical-align:middle;"></span>${ch.name} ${ch.count.toLocaleString()}</div></td>`;
      }).join("")}</tr></table>
    </td></tr>
  </table>
</td></tr>

<!-- Channel 1: LG.com -->
${channelSectionHTML("LG.COM 주간 오버뷰", "🏪", lgcom)}

<!-- Divider -->
<tr><td style="padding:16px 28px 0;">
  <div style="border-top:2px solid #E0DBD3;"></div>
</td></tr>

<!-- Channel 2: Reddit & Communities -->
${channelSectionHTML("REDDIT & 커뮤니티 주간 오버뷰", "💬", reddit)}

<!-- CTA Banner -->
<tr><td style="padding:28px 28px 0;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E0DBD3;border-radius:12px;overflow:hidden;">
    <tr><td colspan="2" style="height:4px;background:#A50034;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr>
      <td style="padding:22px 20px;vertical-align:middle;" width="130">
        <table cellpadding="0" cellspacing="4" border="0"><tr>
          <td style="width:54px;height:48px;background:#F7F4EF;border:1px solid #E8E4DC;border-radius:8px;text-align:center;vertical-align:middle;">
            <div style="font-size:16px;line-height:1;">📊</div>
            <div style="font-family:Inter,Arial,sans-serif;font-size:7px;color:#999;margin-top:1px;">리뷰 분석</div>
          </td>
          <td style="width:54px;height:48px;background:#F7F4EF;border:1px solid #E8E4DC;border-radius:8px;text-align:center;vertical-align:middle;">
            <div style="font-size:16px;line-height:1;">⚡</div>
            <div style="font-family:Inter,Arial,sans-serif;font-size:7px;color:#999;margin-top:1px;">광고 카피</div>
          </td>
          <td style="width:54px;height:48px;background:#F7F4EF;border:1px solid #E8E4DC;border-radius:8px;text-align:center;vertical-align:middle;">
            <div style="font-size:16px;line-height:1;">❓</div>
            <div style="font-family:Inter,Arial,sans-serif;font-size:7px;color:#999;margin-top:1px;">FAQ</div>
          </td>
        </tr></table>
      </td>
      <td style="width:1px;padding:12px 0;vertical-align:middle;">
        <div style="width:1px;height:70px;background:#E8E4DC;"></div>
      </td>
      <td style="padding:22px 22px;vertical-align:middle;">
        <div style="font-family:Inter,Arial,sans-serif;font-size:20px;font-weight:800;color:#1A1A1A;letter-spacing:-0.3px;line-height:1.3;">Review-to-Asset, <span style="color:#A50034;">Instantly.</span></div>
        <div style="font-size:12px;color:#6B6B6B;line-height:1.7;margin-top:6px;">리뷰 분석부터 광고 카피까지 — 리뷰가 증명한 메시지로 만듭니다.</div>
        <a href="${baseUrl}/" style="display:inline-block;margin-top:12px;background:#A50034;color:#fff;border-radius:6px;padding:10px 20px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:600;text-decoration:none;">마케팅 에셋 스튜디오 바로가기 →</a>
      </td>
    </tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 28px;">
  <div style="border-top:1px solid #E0DBD3;padding-top:14px;text-align:center;">
    <div style="font-size:10px;color:#999;">D2C Insight Pulse — Powered LG전자 D2C마케팅전략팀</div>
    <div style="font-size:9px;color:#ccc;margin-top:4px;">본 뉴스레터는 사내 배포용으로 외부 공유를 금합니다.</div>
  </div>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const format = body.format || "html";
    const baseUrl = body.baseUrl || "https://d2cinsightpulse.lovable.app";
    const sendTo = body.sendTo || null;

    // ── Gather data ──
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
    const dateRange = `${fmt(weekAgo)} ~ ${fmt(now)}`;
    const generatedAt = `${fmt(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const [weeklyRes, lastWeekRes, totalRes, productRes] = await Promise.all([
      sb.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", weekAgo.toISOString()),
      sb.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString()),
      sb.from("reviews").select("*", { count: "exact", head: true }),
      sb.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    ]);

    const wow = (lastWeekRes.count || 0) > 0
      ? Math.round((((weeklyRes.count || 0) - (lastWeekRes.count || 0)) / (lastWeekRes.count || 1)) * 100)
      : 0;

    // Source counts for channel bar
    const { data: sourceCounts } = await sb.rpc("get_source_counts");
    const CHANNEL_COLORS: Record<string, { label: string; color: string }> = {
      lge_com: { label: "LG.com", color: "#A50034" },
      reddit: { label: "Reddit", color: "#FF4500" },
      trustpilot: { label: "Trustpilot", color: "#00B67A" },
      youtube: { label: "YouTube", color: "#FF0000" },
      consumer_reports: { label: "Consumer Reports", color: "#0066CC" },
      amazon: { label: "Amazon", color: "#FF9900" },
    };
    const sortedSources = (sourceCounts || []).sort((a: any, b: any) => b.count - a.count);
    const topChannels = sortedSources.slice(0, 6).map((s: any) => {
      const cfg = CHANNEL_COLORS[s.source] || { label: s.source, color: "#888" };
      return { name: cfg.label, count: s.count, color: cfg.color };
    });
    const otherCount = sortedSources.slice(6).reduce((sum: number, s: any) => sum + s.count, 0);
    if (otherCount > 0) {
      topChannels.push({ name: `+${sortedSources.length - 6}개 채널`, count: otherCount, color: "#999" });
    }

    const newsletterData = {
      dateRange, generatedAt,
      weeklyReviews: weeklyRes.count || 0, wow,
      totalReviews: totalRes.count || 0,
      productCount: productRes.count || 0,
      channels: topChannels,
    };

    // ── Generate AI insights (parallel) ──
    console.log("Generating AI channel insights...");
    const [lgcomInsight, redditInsight] = await Promise.all([
      generateChannelInsight(sb, lovableApiKey, "lgcom"),
      generateChannelInsight(sb, lovableApiKey, "reddit"),
    ]);
    console.log("AI insights generated:", { lgcom: !!lgcomInsight, reddit: !!redditInsight });

    // ── Build HTML ──
    const html = buildNewsletterHTML(newsletterData, lgcomInsight, redditInsight, baseUrl);

    // ── Send test email via Resend if requested ──
    let emailSent = false;
    let emailError: string | null = null;
    if (sendTo) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        emailError = "RESEND_API_KEY가 설정되지 않았습니다.";
      } else {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "D2C Insight Pulse <onboarding@resend.dev>",
              to: [sendTo],
              subject: `📮 D2C Insight Pulse Weekly — ${newsletterData.dateRange}`,
              html,
            }),
          });
          const emailResult = await emailRes.json();
          if (emailRes.ok) {
            emailSent = true;
            console.log("Test email sent:", emailResult);
          } else {
            emailError = emailResult?.message || "이메일 발송 실패";
            console.error("Resend error:", emailResult);
          }
        } catch (e) {
          emailError = (e as Error).message;
        }
      }
    }

    if (format === "json") {
      return new Response(JSON.stringify({ html, data: newsletterData, lgcomInsight, redditInsight, emailSent, emailError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Newsletter generation error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
