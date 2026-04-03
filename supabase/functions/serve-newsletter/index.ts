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
  recurring_praise: { text: string; product?: string; category?: string }[];
  key_takeaway?: { product: string; category: string; positive_msg: string; negative_msg: string; marketer_action: string }[];
}

interface AllChannelSummary {
  top_products: { name: string; category: string; positive_msg: string; negative_msg: string }[];
  key_takeaway: string;
  community_weekly: string;
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

위 데이터를 분석하여 아래 5가지 섹션을 **한국어로** 작성해주세요:

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
- 각 항목은 { "text": "칭찬 내용", "product": "제품명", "category": "카테고리" } 형태

## 5. KEY TAKEAWAY — 마케터 인사이트 (key_takeaway)
- 3개 항목, 각 항목은 주로 언급된 제품명, 긍/부정 핵심 메시지, 마케터 액션 제안 포함
- 형태: { "product": "제품명", "category": "TV", "positive_msg": "긍정 핵심 한 줄", "negative_msg": "부정 핵심 한 줄 (없으면 빈 문자열)", "marketer_action": "마케터 액션 제안 한 줄" }

JSON 형식으로 응답: { "top_products": [...], "top_topics": [...], "urgent_issues": [...], "recurring_praise": [...], "key_takeaway": [...] }`;

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

/* ── All-channel summary ── */
async function generateAllChannelSummary(sb: any, lovableApiKey: string): Promise<AllChannelSummary | null> {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: reviews, error } = await sb
    .from("reviews")
    .select("source, sentiment, content, products!inner(display_name, category)")
    .gte("collected_at", weekAgo)
    .limit(600);
  if (error || !reviews?.length) return null;

  const byProduct: Record<string, { name: string; cat: string; pos: string[]; neg: string[]; total: number }> = {};
  for (const r of reviews as any[]) {
    const name = r.products?.display_name || "Unknown";
    const cat = r.products?.category || "";
    if (!byProduct[name]) byProduct[name] = { name, cat, pos: [], neg: [], total: 0 };
    byProduct[name].total++;
    if (r.sentiment === "positive" && byProduct[name].pos.length < 5) byProduct[name].pos.push(r.content.slice(0, 120));
    if (r.sentiment === "negative" && byProduct[name].neg.length < 5) byProduct[name].neg.push(r.content.slice(0, 120));
  }
  const top5 = Object.values(byProduct).sort((a, b) => b.total - a.total).slice(0, 5);
  const dataSummary = top5.map(p => p.name + " (" + p.cat + "): " + p.total + "건, 긍정: " + p.pos.slice(0, 2).join(" | ") + ", 부정: " + p.neg.slice(0, 2).join(" | ")).join("\n");

  const prompt = "다음은 LG전자 전채널(LG.com, Reddit, Amazon, YouTube 등) 최근 1주 리뷰 데이터입니다:\n\n" + dataSummary +
    "\n\n아래 JSON 형식으로 응답:\n" +
    '{"top_products":[{"name":"제품명","category":"TV","positive_msg":"긍정 핵심 한 줄","negative_msg":"부정 핵심 한 줄"}],' +
    '"key_takeaway":"마케터가 이번 주 바로 활용할 수 있는 핵심 액션 포인트 2~3문장",' +
    '"community_weekly":"Amazon, YouTube 등 외부 커뮤니티 리뷰 주간 동향 요약 2~3문장"}';

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + lovableApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a Korean marketing insight generator for LG Electronics. Output valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) return null;
  const aiData = await resp.json();
  try { return JSON.parse(aiData.choices?.[0]?.message?.content || "{}"); } catch { return null; }
}

/* ── Newsletter HTML builder ── */
function buildNewsletterHTML(d: {
  dateRange: string; generatedAt: string;
  weeklyReviews: number; wow: number;
  totalReviews: number; productCount: number;
  channels: { name: string; count: number; color: string }[];
}, lgcom: ChannelInsight | null, reddit: ChannelInsight | null, baseUrl: string, allChannel: AllChannelSummary | null): string {

  const FONT = "'Malgun Gothic','Apple SD Gothic Neo','Segoe UI',Arial,sans-serif";
  const INTER = "Inter,'Segoe UI',Arial,sans-serif";

  /* ── Key Takeaway block ── */
  function renderKeyTakeaway(label: string, icon: string, borderColor: string, insight: ChannelInsight | null) {
    const items = insight?.key_takeaway;
    if (!items || items.length === 0) return "";
    const rows = items.map(item => `
      <tr><td style="padding:12px 16px;border-bottom:1px solid #F0ECE4;font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="padding-bottom:4px;">
            <!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#F0ECE4;padding:1px 8px;font-size:10px;font-weight:700;color:#888;mso-line-height-rule:exactly;line-height:16px;">${item.category}</td><td style="padding-left:6px;font-weight:700;font-size:12px;color:#1a1a1a;">${item.product}</td></tr></table><![endif]-->
            <!--[if !mso]><!--><span style="display:inline-block;background:#F0ECE4;border-radius:4px;padding:1px 8px;font-size:10px;font-weight:700;color:#888;margin-right:6px;">${item.category}</span><span style="font-weight:700;font-size:12px;color:#1a1a1a;">${item.product}</span><!--<![endif]-->
          </td>
        </tr></table>
        ${item.positive_msg ? `<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:11px;color:#006600;padding-bottom:3px;font-family:${FONT};">👍 ${item.positive_msg}</td></tr></table>` : ""}
        ${item.negative_msg ? `<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:11px;color:#A50034;padding-bottom:3px;font-family:${FONT};">👎 ${item.negative_msg}</td></tr></table>` : ""}
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr><td style="background:#FFFBEB;padding:6px 10px;font-family:${FONT};">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="font-size:10px;font-weight:700;color:#D97706;padding-bottom:2px;">🎯 마케팅 액션</td></tr>
              <tr><td style="font-size:11px;color:#333;line-height:18px;">${item.marketer_action}</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>`).join("");

    return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;mso-table-lspace:0pt;mso-table-rspace:0pt;">
      <tr><td style="border-left:4px solid ${borderColor};padding-left:10px;font-size:12px;font-weight:700;color:#333;padding-bottom:8px;font-family:${FONT};">${icon} ${label}</td></tr>
      <tr><td>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;mso-table-lspace:0pt;mso-table-rspace:0pt;">${rows}</table>
      </td></tr>
    </table>`;
  }

  /* ── Channel section HTML ── */
  function channelSectionHTML(label: string, icon: string, insight: ChannelInsight | null) {
    if (!insight) return `
    <tr><td style="padding:24px 32px 0;font-family:${FONT};">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:14px;font-weight:800;color:#EA1917;padding-bottom:8px;font-family:${INTER};">${icon} ${label}</td></tr>
        <tr><td style="text-align:center;padding:24px;color:#999;font-size:12px;border:1px solid #E0DBD3;background:#F7F4EF;">데이터 없음</td></tr>
      </table>
    </td></tr>`;

    // Top products
    const productsHTML = (insight.top_products || []).slice(0, 5).map(p => `
      <tr><td style="padding:14px 16px;border-bottom:1px solid #F0ECE4;font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="32" valign="top" style="padding-top:2px;">
            <!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:24px;height:24px;background:#EA1917;color:#ffffff;font-size:11px;font-weight:800;text-align:center;mso-line-height-rule:exactly;line-height:24px;">${p.rank}</td></tr></table><![endif]-->
            <!--[if !mso]><!--><div style="width:24px;height:24px;background:#EA1917;border-radius:50%;color:#fff;font-size:11px;font-weight:800;text-align:center;line-height:24px;">${p.rank}</div><!--<![endif]-->
          </td>
          <td style="padding-left:12px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="font-weight:700;font-size:13px;color:#1a1a1a;padding-bottom:2px;font-family:${FONT};">${p.name}</td></tr>
              <tr><td style="font-size:10px;color:#888;padding-bottom:8px;font-family:${FONT};">${p.category} · 언급 ${p.mention_count}건</td></tr>
              <tr><td>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0FDF4;border:1px solid #BBF7D0;">
                  <tr><td style="padding:8px 12px;font-family:${FONT};">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="font-size:9px;font-weight:700;color:#006600;text-transform:uppercase;padding-bottom:3px;">👍 긍정 요약</td></tr>
                      <tr><td style="font-size:11px;color:#1a1a1a;line-height:18px;">${p.pos_summary}</td></tr>
                    </table>
                  </td></tr>
                </table>
              </td></tr>
              ${p.neg_summary && p.neg_summary !== "특이 불만 없음" ? `
              <tr><td style="padding-top:6px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFF5F5;border:1px solid #FECACA;">
                  <tr><td style="padding:8px 12px;font-family:${FONT};">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="font-size:9px;font-weight:700;color:#A50034;text-transform:uppercase;padding-bottom:3px;">👎 부정 요약</td></tr>
                      <tr><td style="font-size:11px;color:#1a1a1a;line-height:18px;">${p.neg_summary}</td></tr>
                    </table>
                  </td></tr>
                </table>
              </td></tr>` : ""}
              ${(p.praise_points || []).length > 0 ? `
              <tr><td style="padding-top:6px;font-family:${FONT};">
                ${p.praise_points.map(pp => `<table cellpadding="0" cellspacing="0" border="0" style="display:inline-block;mso-table-lspace:0pt;mso-table-rspace:0pt;margin:2px 3px 2px 0;"><tr><td style="background:#F7F4EF;border:1px solid #E0DBD3;padding:2px 8px;font-size:10px;color:#555;">✅ ${pp}</td></tr></table>`).join("")}
              </td></tr>` : ""}
            </table>
          </td>
        </tr></table>
      </td></tr>`).join("");

    // Top topics
    const topicsHTML = (insight.top_topics || []).map(t => `
      <tr><td style="padding:10px 16px;border-bottom:1px solid #F0ECE4;font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="font-weight:600;font-size:12px;color:#1a1a1a;padding-bottom:3px;">${t.rank}. ${t.topic}</td></tr>
          <tr><td style="font-size:10px;color:#888;padding-bottom:4px;"><span style="color:#006600;font-weight:600;">긍정 ${t.positive_pct}%</span> · 언급 ${t.mention_pct}%</td></tr>
          <tr><td style="font-size:10px;color:#555;font-style:italic;background:#F7F4EF;padding:5px 8px;">"${t.representative_comment}"</td></tr>
        </table>
      </td></tr>`).join("");

    // Urgent issues
    const issuesHTML = (insight.urgent_issues || []).map(iss => `
      <tr><td style="padding:10px 16px;border-bottom:1px solid #FECACA;font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="font-weight:600;font-size:12px;color:#A50034;padding-bottom:3px;">⚠️ ${iss.rank}. ${iss.issue} <span style="color:#888;font-weight:400;">(${iss.mention_pct}%)</span></td></tr>
          <tr><td style="font-size:10px;color:#666;"><strong>패턴</strong> ${iss.pattern} · <strong>원인</strong> ${iss.cause}</td></tr>
        </table>
      </td></tr>`).join("");

    // Recurring praise
    const praiseRows = (insight.recurring_praise || []).map(p => {
      const item = typeof p === "string" ? { text: p } : p;
      return `<tr><td style="padding:3px 0;font-size:11px;color:#006600;line-height:18px;font-family:${FONT};">✅ ${item.product ? `<strong>${item.product}</strong> — ` : ""}${item.text}</td></tr>`;
    }).join("");

    return `
    <tr><td style="padding:24px 32px 0;font-family:${FONT};">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:14px;font-weight:800;color:#EA1917;padding-bottom:16px;font-family:${INTER};">${icon} ${label}</td></tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:12px;font-weight:700;color:#333;padding-bottom:8px;font-family:${FONT};">📦 가장 많이 언급된 제품</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;margin-bottom:20px;mso-table-lspace:0pt;mso-table-rspace:0pt;">${productsHTML}</table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:12px;font-weight:700;color:#333;padding-bottom:8px;font-family:${FONT};">🔥 주요 키워드 TOP 5</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;margin-bottom:20px;mso-table-lspace:0pt;mso-table-rspace:0pt;">${topicsHTML}</table>

      ${issuesHTML ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:12px;font-weight:700;color:#A50034;padding-bottom:8px;font-family:${FONT};">🚨 개선 시급 이슈 TOP 3</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #FECACA;background:#FFFBFB;margin-bottom:20px;mso-table-lspace:0pt;mso-table-rspace:0pt;">${issuesHTML}</table>` : ""}

      ${praiseRows ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0FDF4;border:1px solid #BBF7D0;margin-bottom:8px;mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr><td style="padding:14px 16px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="font-size:11px;font-weight:700;color:#006600;padding-bottom:6px;font-family:${FONT};">🏆 반복 칭찬 포인트</td></tr>
            ${praiseRows}
          </table>
        </td></tr>
      </table>` : ""}
    </td></tr>`;
  }

  /* ── Channel badges ── */
  const channelBadges = d.channels.map(ch => {
    if (ch.name === "LG.com") {
      return `<td style="padding:0 3px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#A50034;color:#ffffff;padding:4px 12px;font-size:11px;font-weight:700;font-family:${FONT};mso-line-height-rule:exactly;line-height:16px;"><!--[if !mso]><!--><span style="border-radius:14px;">${ch.name} ${ch.count.toLocaleString()}</span><!--<![endif]--><!--[if mso]>${ch.name} ${ch.count.toLocaleString()}<![endif]--></td></tr></table></td>`;
    }
    return `<td style="padding:0 3px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid #E0DBD3;padding:4px 10px;font-size:11px;color:#444;font-family:${FONT};mso-line-height-rule:exactly;line-height:16px;"><!--[if mso]><span style="font-size:6px;color:${ch.color};">&#9679;</span><![endif]--><!--[if !mso]><!--><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${ch.color};margin-right:4px;vertical-align:middle;"></span><!--<![endif]-->${ch.name} ${ch.count.toLocaleString()}</td></tr></table></td>`;
  }).join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="ko">
<head>
<meta charset="UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<title>D2C Insight Pulse Weekly</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<style>
table {border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
td {border-collapse:collapse;mso-line-height-rule:exactly;}
a {text-decoration:none;}
</style>
<![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  body, table, td, p, a, li { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  @media only screen and (max-width:699px) {
    .email-container { width:100% !important; max-width:100% !important; }
    .stack-column { display:block !important; width:100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#EFECE5;font-family:${FONT};word-spacing:normal;">

<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFECE5;"><tr><td align="center"><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFECE5;">
<tr><td align="center" style="padding:24px 0;">

<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" align="center" style="width:680px;background-color:#FAFAF7;"><tr><td><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" class="email-container" style="max-width:680px;background:#FAFAF7;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

<!-- Header -->
<tr><td style="padding:28px 32px 18px;border-bottom:1px solid #E8E4DC;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td style="font-family:${INTER};">
      <div style="font-size:24px;font-weight:800;color:#EA1917;letter-spacing:-0.5px;mso-line-height-rule:exactly;line-height:30px;">D2C Insight Pulse</div>
      <div style="font-size:12px;color:#888;margin-top:4px;mso-line-height-rule:exactly;line-height:18px;">Weekly Insight Report &nbsp;·&nbsp; <em style="color:#bbb;">Feel the Pulse. Gain the Insight.</em></div>
    </td>
    <td width="140" style="text-align:right;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right">
        <tr><td style="border:2px solid #EA1917;padding:6px 14px;text-align:center;font-family:${INTER};">
          <div style="font-size:10px;font-weight:800;color:#EA1917;letter-spacing:1px;mso-line-height-rule:exactly;line-height:14px;">WEEKLY REPORT</div>
          <div style="font-size:9px;color:#888;margin-top:3px;mso-line-height-rule:exactly;line-height:13px;">${d.dateRange}</div>
        </td></tr>
      </table>
    </td>
  </tr></table>
</td></tr>

<!-- Intro -->
<tr><td style="padding:18px 32px;border-bottom:1px solid #E8E4DC;font-family:${FONT};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="font-size:12px;font-weight:700;color:#333;padding-bottom:4px;mso-line-height-rule:exactly;line-height:18px;">고객의 생생한 목소리에서 마케팅의 해답을 찾습니다.</td></tr>
    <tr><td style="font-size:11px;color:#888;line-height:20px;">LG.com, Reddit, Best Buy, Walmart, Target, Quora, Stack Exchange 등 30개 이상의 채널에서 수집한 실사용자 리뷰를 분석하여 즉시 활용 가능한 마케팅 인사이트를 제공하는 데이터 플랫폼입니다.</td></tr>
  </table>
</td></tr>

<!-- Data Bar -->
<tr><td style="padding:16px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;background:#FAFAF7;">
    <tr><td style="padding:12px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:12px;font-weight:700;color:#333;font-family:${FONT};">데이터 수집 현황</td>
        <td style="text-align:right;font-size:11px;color:#666;font-family:${FONT};">
          <strong style="color:#EA1917;font-size:14px;">${d.totalReviews.toLocaleString()}</strong>
          <span style="color:#888;">건 · ${d.productCount.toLocaleString()}개 제품</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 16px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${channelBadges}</tr></table>
    </td></tr>
  </table>
</td></tr>

<!-- KEY TAKEAWAY -->
<tr><td style="padding:24px 32px 0;font-family:${FONT};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="font-size:14px;font-weight:800;color:#EA1917;padding-bottom:16px;font-family:${INTER};">💡 KEY TAKEAWAY — 채널별 마케터 인사이트</td></tr>
  </table>

  ${renderKeyTakeaway("LG.COM", "🏪", "#A50034", lgcom)}
  ${renderKeyTakeaway("REDDIT", "💬", "#FF4500", reddit)}

  ${allChannel ? `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:4px;">
    <tr><td style="border-left:4px solid #0066CC;padding-left:10px;font-size:12px;font-weight:700;color:#333;padding-bottom:8px;font-family:${FONT};">🌐 전채널 종합</td></tr>
    <tr><td>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;background:#F7F7F2;">
        <tr><td style="padding:14px 16px;font-size:12px;color:#1a1a1a;line-height:20px;font-family:${FONT};">${allChannel.key_takeaway}</td></tr>
      </table>
    </td></tr>
  </table>` : ""}
</td></tr>

<!-- Divider -->
<tr><td style="padding:16px 32px 0;font-size:0;line-height:0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:2px solid #E8E4DC;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>

<!-- LG.com Section -->
${channelSectionHTML("LG.COM 주간 오버뷰", "🏪", lgcom)}

<!-- Divider -->
<tr><td style="padding:16px 32px 0;font-size:0;line-height:0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:2px solid #E8E4DC;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>

<!-- Reddit Section -->
${channelSectionHTML("REDDIT & 커뮤니티 주간 오버뷰", "💬", reddit)}

<!-- CTA Banner -->
<tr><td style="padding:28px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E0DBD3;">
    <tr><td colspan="3" style="height:4px;background:#A50034;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr>
    <tr>
      <td width="180" style="padding:20px 16px;vertical-align:middle;">
        <table role="presentation" cellpadding="0" cellspacing="4" border="0"><tr>
          <td width="54" height="48" style="background:#F7F4EF;border:1px solid #E8E4DC;text-align:center;vertical-align:middle;font-family:${FONT};"><div style="font-size:16px;">📊</div><div style="font-size:7px;color:#999;">리뷰 분석</div></td>
          <td width="54" height="48" style="background:#F7F4EF;border:1px solid #E8E4DC;text-align:center;vertical-align:middle;font-family:${FONT};"><div style="font-size:16px;">⚡</div><div style="font-size:7px;color:#999;">광고 카피</div></td>
          <td width="54" height="48" style="background:#F7F4EF;border:1px solid #E8E4DC;text-align:center;vertical-align:middle;font-family:${FONT};"><div style="font-size:16px;">❓</div><div style="font-size:7px;color:#999;">FAQ</div></td>
        </tr></table>
      </td>
      <td width="1" style="padding:12px 0;vertical-align:middle;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:1px;height:70px;background:#E8E4DC;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
      <td style="padding:20px 22px;vertical-align:middle;font-family:${FONT};">
        <div style="font-family:${INTER};font-size:14px;font-weight:700;color:#888;mso-line-height-rule:exactly;line-height:20px;">Marketing Asset Studio</div>
        <div style="font-family:${INTER};font-size:20px;font-weight:800;color:#1A1A1A;letter-spacing:-0.3px;mso-line-height-rule:exactly;line-height:26px;margin-top:2px;">Review-to-Asset,<br/><span style="color:#A50034;">Instantly.</span></div>
        <div style="font-size:11px;color:#888;line-height:18px;margin-top:6px;">광고 카피부터 이미지 에셋까지 —<br/>리뷰가 증명한 메시지로 만듭니다.</div>
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;"><tr><td style="background:#A50034;padding:8px 18px;"><a href="${baseUrl}/" style="color:#ffffff;font-family:${INTER};font-size:11px;font-weight:600;text-decoration:none;">마케팅 에셋 스튜디오 바로가기 →</a></td></tr></table><![endif]-->
        <!--[if !mso]><!--><a href="${baseUrl}/" style="display:inline-block;margin-top:10px;background:#A50034;color:#fff;border-radius:6px;padding:8px 18px;font-family:${INTER};font-size:11px;font-weight:600;text-decoration:none;">마케팅 에셋 스튜디오 바로가기 →</a><!--<![endif]-->
      </td>
    </tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td style="font-family:${INTER};"><div style="font-size:11px;font-weight:700;color:#1a1a1a;mso-line-height-rule:exactly;line-height:16px;">D2C Insight Pulse</div><div style="font-size:9px;color:#999;margin-top:2px;mso-line-height-rule:exactly;line-height:14px;">Produced by LG전자 D2C마케팅전략팀</div></td>
    <td style="text-align:right;font-family:${FONT};"><div style="font-size:9px;color:#ccc;line-height:14px;">본 뉴스레터는 사내 배포용으로<br/>외부 공유를 금합니다.</div></td>
  </tr></table>
</td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->

</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->

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
    const fmt = (dt: Date) => `${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(dt.getDate())}`;
    const dateRange = `${fmt(weekAgo)} – ${fmt(now)}`;
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
    const topChannels = sortedSources.slice(0, 4).map((s: any) => {
      const cfg = CHANNEL_COLORS[s.source] || { label: s.source, color: "#888" };
      return { name: cfg.label, count: s.count, color: cfg.color };
    });
    const otherCount = sortedSources.slice(4).reduce((sum: number, s: any) => sum + s.count, 0);
    if (otherCount > 0) {
      topChannels.push({ name: `+${sortedSources.length - 4}개 채널`, count: otherCount, color: "#999" });
    }

    const newsletterData = {
      dateRange, generatedAt,
      weeklyReviews: weeklyRes.count || 0, wow,
      totalReviews: totalRes.count || 0,
      productCount: productRes.count || 0,
      channels: topChannels,
    };

    // ── Generate AI insights ──
    console.log("Generating AI channel insights...");
    const [lgcomInsight, redditInsight, allChannelSummary] = await Promise.all([
      generateChannelInsight(sb, lovableApiKey, "lgcom"),
      generateChannelInsight(sb, lovableApiKey, "reddit"),
      generateAllChannelSummary(sb, lovableApiKey),
    ]);
    console.log("AI insights generated:", { lgcom: !!lgcomInsight, reddit: !!redditInsight, allChannel: !!allChannelSummary });

    const html = buildNewsletterHTML(newsletterData, lgcomInsight, redditInsight, baseUrl, allChannelSummary);

    // ── Send test email ──
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
          } else {
            emailError = emailResult?.message || "이메일 발송 실패";
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
