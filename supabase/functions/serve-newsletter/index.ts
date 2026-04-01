import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChannelOverview {
  top_topics: { rank: number; topic: string; mention_pct: number; positive_pct: number; negative_pct: number; representative_comment: string; related_products: string[] }[];
  urgent_issues: { rank: number; issue: string; mention_pct: number; pattern: string; cause: string; related_products: string[] }[];
  recurring_praise: string[];
  unmatched_praise: string[];
}

interface ChannelSentiment { posPct: number; negPct: number; neutralPct: number; total: number }

/* ── AI overview generation (same logic as generate-overview-summary) ── */
async function generateOverview(sb: any, lovableApiKey: string, channel: "lgcom" | "reddit"): Promise<ChannelOverview | null> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let query = sb
    .from("reviews")
    .select("title, content, sentiment, sentiment_score, rating, source, products!inner(display_name, model_number, category, sub_category)")
    .order("collected_at", { ascending: false })
    .limit(500);

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
      productMap[pName] = { name: pName, model: r.products?.model_number || "", category: r.products?.category || "", subCategory: r.products?.sub_category || "", pos: 0, neg: 0, titles: [] as string[] };
    }
    if (r.sentiment === "positive") productMap[pName].pos++;
    if (r.sentiment === "negative") productMap[pName].neg++;
    if (r.title && productMap[pName].titles.length < 10) productMap[pName].titles.push(r.title);
  }

  const topProducts = Object.values(productMap).sort((a: any, b: any) => (b.pos + b.neg) - (a.pos + a.neg)).slice(0, 15);
  const productSummary = topProducts.map((p: any) =>
    `${p.name} (${p.model}, ${p.category}${p.subCategory ? ` > ${p.subCategory}` : ""}): 긍정 ${p.pos}건, 부정 ${p.neg}건, 키워드: ${p.titles.slice(0, 5).join(", ")}`
  ).join("\n");

  const posTitles = posReviews.slice(0, 50).map((r: any) => r.title).filter(Boolean).join(", ");
  const negTitles = negReviews.slice(0, 50).map((r: any) => r.title).filter(Boolean).join(", ");
  const channelLabel = channel === "lgcom" ? "LG.com 공식 리뷰" : "Reddit 커뮤니티";

  const systemPrompt = `You are an expert consumer insight analyst for LG Electronics. Analyze ${channelLabel} data and provide structured weekly overview in Korean. Be specific with product names and real patterns from the data.`;

  const userPrompt = `다음은 ${channelLabel}의 최근 수집된 리뷰 데이터입니다:

총 리뷰: ${reviews.length}건 (긍정 ${posReviews.length}건, 부정 ${negReviews.length}건)

제품별 현황:
${productSummary}

긍정 키워드 TOP: ${posTitles.slice(0, 500)}
부정 키워드 TOP: ${negTitles.slice(0, 500)}

위 데이터를 기반으로 아래 4가지 섹션을 분석해주세요:

## 1. 고객이 가장 많이 말하는 5가지 주제 (TOP 5 Topics)
각 주제별로:
- 주제명 (구체적)
- 전체 언급 비율 (%)
- 긍정 비율 (%) / 부정 비율 (%)
- 대표 코멘트 (1줄 요약)
- 관련 제품 모델명 리스트

## 2. 개선 시급 이슈 TOP 3 (Urgent Issues)
각 이슈별로:
- 이슈명, 언급 비율 (%), 패턴, 원인, 관련 제품

## 3. 반복 칭찬 포인트 5개

## 4. 절대적 칭찬 포인트 4~5개

JSON: { "top_topics": [...], "urgent_issues": [...], "recurring_praise": [...], "unmatched_praise": [...] }`;

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

/* ── Newsletter HTML builder (mirrors WeeklyNewsletterHTML.tsx) ── */
function buildNewsletterHTML(d: {
  dateRange: string; generatedAt: string;
  totalReviews: number; weeklyReviews: number;
  lgcomCount: number; redditCount: number; communityCount: number; wow: number;
  lgcomSentiment: ChannelSentiment; redditSentiment: ChannelSentiment;
}, lgcom: ChannelOverview | null, reddit: ChannelOverview | null, baseUrl: string): string {
  const wowColor = d.wow >= 0 ? "#22c55e" : "#ef4444";
  const wowSign = d.wow >= 0 ? "+" : "";

  function channelProductsHTML(label: string, emoji: string, sentiment: ChannelSentiment) {
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
    if (!overview) return "";

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

<!-- Header -->
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

${channelProductsHTML("LG.COM", "🏪", d.lgcomSentiment)}
${channelProductsHTML("REDDIT", "💬", d.redditSentiment)}
${overviewHTML("LG.COM", "🏪", lgcom)}
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
        <a href="${baseUrl}/" style="display:inline-block;margin-top:14px;border:1.5px solid #1A1A1A;color:#1A1A1A;background:transparent;border-radius:7px;padding:9px 18px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">마케팅 에셋 스튜디오 바로가기 →</a>
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
    const format = body.format || "html"; // "html" | "json"
    const baseUrl = body.baseUrl || "https://d2cinsightpulse.lovable.app";
    const sendTo = body.sendTo || null; // email address for test send

    // ── Gather newsletter data ──
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
    const dateRange = `${fmt(weekAgo)} ~ ${fmt(now)}`;
    const generatedAt = `${fmt(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const [totalRes, weeklyRes, lastWeekRes] = await Promise.all([
      sb.from("reviews").select("*", { count: "exact", head: true }),
      sb.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", weekAgo.toISOString()),
      sb.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString()),
    ]);

    // Source counts
    const { data: sourceCounts } = await sb.rpc("get_source_counts");
    const sourceMap: Record<string, number> = {};
    for (const s of (sourceCounts || [])) sourceMap[s.source] = s.count;
    const lgcomCount = sourceMap["lge_com"] || 0;
    const redditCount = sourceMap["reddit"] || 0;
    let communityCount = 0;
    for (const [src, cnt] of Object.entries(sourceMap)) {
      if (src !== "lge_com" && src !== "reddit") communityCount += cnt;
    }
    const wow = (lastWeekRes.count || 0) > 0
      ? Math.round((((weeklyRes.count || 0) - (lastWeekRes.count || 0)) / (lastWeekRes.count || 1)) * 100)
      : 0;

    // Channel sentiment
    const [lgcomRevRes, redditRevRes] = await Promise.all([
      sb.from("reviews").select("sentiment").like("source", "lge_com%").gte("collected_at", weekAgo.toISOString()).limit(1000),
      sb.from("reviews").select("sentiment").eq("source", "reddit").gte("collected_at", weekAgo.toISOString()).limit(1000),
    ]);

    function buildSentiment(reviews: any[]): ChannelSentiment {
      const total = reviews.length;
      const pos = reviews.filter((r: any) => r.sentiment === "positive").length;
      const neg = reviews.filter((r: any) => r.sentiment === "negative").length;
      return { total, posPct: total > 0 ? Math.round((pos / total) * 100) : 0, negPct: total > 0 ? Math.round((neg / total) * 100) : 0, neutralPct: total > 0 ? Math.round(((total - pos - neg) / total) * 100) : 0 };
    }

    const newsletterData = {
      dateRange, generatedAt,
      totalReviews: totalRes.count || 0, weeklyReviews: weeklyRes.count || 0,
      lgcomCount, redditCount, communityCount, wow,
      lgcomSentiment: buildSentiment(lgcomRevRes.data || []),
      redditSentiment: buildSentiment(redditRevRes.data || []),
    };

    // ── Generate AI overviews (parallel) ──
    console.log("Generating AI overviews...");
    const [lgcomOverview, redditOverview] = await Promise.all([
      generateOverview(sb, lovableApiKey, "lgcom"),
      generateOverview(sb, lovableApiKey, "reddit"),
    ]);
    console.log("AI overviews generated:", { lgcom: !!lgcomOverview, reddit: !!redditOverview });

    // ── Build HTML ──
    const html = buildNewsletterHTML(newsletterData, lgcomOverview, redditOverview, baseUrl);

    if (format === "json") {
      return new Response(JSON.stringify({ html, data: newsletterData, lgcomOverview, redditOverview }), {
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
