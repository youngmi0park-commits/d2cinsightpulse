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
  const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString();
  let query = sb
    .from("reviews")
    .select("title, content, sentiment, sentiment_score, rating, source, products!inner(display_name, model_number, category, sub_category)")
    .gte("published_at", weekAgoStr)
    .order("published_at", { ascending: false })
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
- rank, name, category, mention_count
- pos_summary: **반드시 한 문장 60자 이내**로 핵심 강점만 (예: "선명한 화질·세련된 디자인 호평, 특히 게이밍 시청 만족도↑")
- neg_summary: **한 문장 50자 이내** 또는 "특이 불만 없음"
- praise_points: 정확히 3개, 각 8자 이내 짧은 키워드 (예: ["선명한 화질", "슬림 디자인", "가성비 우수"])

## 2. 고객이 가장 많이 말하는 주제 TOP 3 (top_topics)
각 주제별:
- rank, topic (한국어 12자 이내), mention_pct, positive_pct, negative_pct
- representative_comment: **한 문장 45자 이내** 핵심만
- related_products

## 3. 개선 시급 이슈 TOP 3 (urgent_issues)
- rank, issue (15자 이내), mention_pct, pattern (25자 이내), cause (25자 이내), related_products

## 4. 반복 칭찬 포인트 5개 (recurring_praise)
- 각 항목 { "text": "20자 이내 짧은 칭찬", "product": "제품명", "category": "카테고리" }

## 5. KEY TAKEAWAY — 카테고리별 마케터 인사이트 (key_takeaway)
- **카테고리별로 1개씩** 선정 (TV, Washer, Refrigerator, Dryer, Dishwasher, Monitor, Audio, Vacuum, Air Conditioner, Air Purifier 등 실제 데이터에 존재하는 카테고리만)
- 각 카테고리마다 가장 언급량이 많고 시그널이 명확한 대표 제품 1개를 골라 인사이트 작성
- 동일 카테고리 항목 중복 금지, 카테고리당 정확히 1개
- 최대 8개 카테고리까지, 언급량 기준 내림차순 정렬
- 형태: { "product": "제품명", "category": "TV", "positive_msg": "긍정 핵심 한 줄 (실제 사용자 표현 인용)", "negative_msg": "부정 핵심 한 줄 (없으면 빈 문자열)", "marketer_action": "해당 카테고리 마케터가 즉시 실행할 액션 한 줄 (PMAX/Affiliate/FAQ/PDP/CRITEO 등 채널 명시)" }

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
    .gte("published_at", weekAgo)
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
  topPositiveKeyword: string; topPositiveCount: number;
  topNegativeKeyword: string; topNegativeCount: number;
  topProduct: string; topProductCount: number;
  opportunities: { tag: string; title: string; desc: string; count: number; delta: string; country: string; channel: string }[];
  trendingSignals: { keyword: string; count: number; delta: number; type: string; sentiment: string }[];
}, lgcom: ChannelInsight | null, reddit: ChannelInsight | null, baseUrl: string, allChannel: AllChannelSummary | null): string {

  // LG.com Design System tokens (LGEI Text fallback chain → Inter → Noto Sans KR → system)
  const FONT = "'LGEI Text','LG SmHaT','Inter','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo','Segoe UI',Arial,sans-serif";
  const INTER = "'LGEI Text','LG SmHaT','Inter','Segoe UI',Arial,sans-serif";

  /* ── Key Takeaway block — 카테고리별 1개씩 (중복 제거) ── */
  function renderKeyTakeaway(label: string, icon: string, borderColor: string, insight: ChannelInsight | null) {
    const raw = insight?.key_takeaway;
    if (!raw || raw.length === 0) return "";
    // 카테고리별 첫 항목만 유지 (AI가 중복 생성해도 1 per category 보장)
    const seen = new Set<string>();
    const items = raw.filter(it => {
      const key = (it.category || "기타").trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
    if (items.length === 0) return "";
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
        <tr><td style="text-align:center;padding:24px;color:#999;font-size:12px;border:1px solid #E0DBD3;background:#EFECE5;">데이터 없음</td></tr>
      </table>
    </td></tr>`;

    // 서버 측 길이 강제 (AI가 길게 응답해도 잘라냄)
    const trim = (s: string | undefined, n: number) => {
      if (!s) return "";
      const t = String(s).replace(/\s+/g, " ").trim();
      return t.length > n ? t.slice(0, n - 1) + "…" : t;
    };

    // Top products — 컴팩트 카드
    const productsHTML = (insight.top_products || []).slice(0, 5).map(p => `
      <tr><td style="padding:10px 14px;border-bottom:1px solid #F0ECE4;font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="28" valign="top" style="padding-top:1px;">
            <!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:22px;height:22px;background:#EA1917;color:#ffffff;font-size:11px;font-weight:800;text-align:center;mso-line-height-rule:exactly;line-height:22px;">${p.rank}</td></tr></table><![endif]-->
            <!--[if !mso]><!--><div style="width:22px;height:22px;background:#EA1917;border-radius:50%;color:#fff;font-size:11px;font-weight:800;text-align:center;line-height:22px;">${p.rank}</div><!--<![endif]-->
          </td>
          <td style="padding-left:10px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="font-weight:700;font-size:12.5px;color:#1a1a1a;padding-bottom:1px;font-family:${FONT};">${p.name} <span style="font-weight:500;font-size:10px;color:#4A4A4A;">· ${p.category} · ${String(p.mention_count).replace(/건/g, "")}건</span></td></tr>
              <tr><td style="padding-top:5px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0FDF4;border-left:3px solid #16a34a;">
                  <tr><td style="padding:6px 10px;font-size:11px;color:#1a1a1a;line-height:17px;font-family:${FONT};"><span style="color:#006600;font-weight:700;">👍</span> ${trim(p.pos_summary, 70)}</td></tr>
                </table>
              </td></tr>
              ${p.neg_summary && p.neg_summary !== "특이 불만 없음" ? `
              <tr><td style="padding-top:4px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFF5F5;border-left:3px solid #A50034;">
                  <tr><td style="padding:6px 10px;font-size:11px;color:#1a1a1a;line-height:17px;font-family:${FONT};"><span style="color:#A50034;font-weight:700;">👎</span> ${trim(p.neg_summary, 60)}</td></tr>
                </table>
              </td></tr>` : ""}
              ${(p.praise_points || []).length > 0 ? `
              <tr><td style="padding-top:5px;font-family:${FONT};">
                ${p.praise_points.slice(0, 3).map(pp => `<table cellpadding="0" cellspacing="0" border="0" style="display:inline-block;mso-table-lspace:0pt;mso-table-rspace:0pt;margin:1px 3px 1px 0;"><tr><td style="background:#EFECE5;border:1px solid #E0DBD3;padding:1px 7px;font-size:10px;color:#3A3A3A;">✅ ${trim(pp, 12)}</td></tr></table>`).join("")}
              </td></tr>` : ""}
            </table>
          </td>
        </tr></table>
      </td></tr>`).join("");

    // Top topics — 3개 / 한 줄 정돈
    const topicsHTML = (insight.top_topics || []).slice(0, 3).map(t => `
      <tr><td style="padding:8px 14px;border-bottom:1px solid #F0ECE4;font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-weight:700;font-size:12px;color:#1a1a1a;">${t.rank}. ${trim(t.topic, 18)}</td>
            <td align="right" style="font-size:10px;color:#4A4A4A;white-space:nowrap;"><span style="color:#006600;font-weight:700;">긍정 ${String(t.positive_pct).replace(/%/g, "")}%</span> · ${String(t.mention_pct).replace(/%/g, "")}%</td>
          </tr>
          <tr><td colspan="2" style="padding-top:3px;font-size:10.5px;color:#3A3A3A;font-style:italic;background:#EFECE5;padding:5px 8px;line-height:15px;">"${trim(t.representative_comment, 55)}"</td></tr>
        </table>
      </td></tr>`).join("");

    // Urgent issues — 한 줄로 통합
    const issuesHTML = (insight.urgent_issues || []).slice(0, 3).map(iss => `
      <tr><td style="padding:8px 14px;border-bottom:1px solid #FECACA;font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="font-weight:700;font-size:12px;color:#A50034;padding-bottom:2px;">⚠️ ${iss.rank}. ${trim(iss.issue, 20)} <span style="color:#777;font-weight:500;">(${iss.mention_pct}%)</span></td></tr>
          <tr><td style="font-size:10.5px;color:#333;line-height:15px;">${trim(iss.pattern, 35)} · <span style="color:#777;">${trim(iss.cause, 35)}</span></td></tr>
        </table>
      </td></tr>`).join("");

    // Recurring praise — 컴팩트 한 줄씩
    const praiseRows = (insight.recurring_praise || []).slice(0, 5).map(p => {
      const item = typeof p === "string" ? ({ text: p } as any) : p;
      return `<tr><td style="padding:2px 0;font-size:11px;color:#006600;line-height:16px;font-family:${FONT};">✅ ${item.product ? `<strong>${item.product}</strong> — ` : ""}${trim(item.text, 30)}</td></tr>`;
    }).join("");

    return `
    <tr><td style="padding:20px 32px 0;font-family:${FONT};">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:14px;font-weight:800;color:#EA1917;padding-bottom:10px;font-family:${INTER};">${icon} ${label}</td></tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:11px;font-weight:700;color:#333;padding-bottom:5px;font-family:${FONT};">📦 가장 많이 언급된 제품</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;margin-bottom:12px;mso-table-lspace:0pt;mso-table-rspace:0pt;">${productsHTML}</table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:11px;font-weight:700;color:#333;padding-bottom:5px;font-family:${FONT};">🔥 주요 키워드 TOP 3</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;margin-bottom:12px;mso-table-lspace:0pt;mso-table-rspace:0pt;">${topicsHTML}</table>

      ${issuesHTML ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:11px;font-weight:700;color:#A50034;padding-bottom:5px;font-family:${FONT};">🚨 개선 시급 이슈</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #FECACA;background:#FFFBFB;margin-bottom:12px;mso-table-lspace:0pt;mso-table-rspace:0pt;">${issuesHTML}</table>` : ""}

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
      return `<td style="padding:0 3px;"><!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#A50034;color:#ffffff;padding:4px 12px;font-size:11px;font-weight:700;font-family:${FONT};mso-line-height-rule:exactly;line-height:16px;">${ch.name} ${ch.count.toLocaleString()}</td></tr></table><![endif]--><!--[if !mso]><!--><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#A50034;color:#ffffff;padding:4px 12px;font-size:11px;font-weight:700;font-family:${FONT};border-radius:50px;line-height:16px;">${ch.name} ${ch.count.toLocaleString()}</td></tr></table><!--<![endif]--></td>`;
    }
    return `<td style="padding:0 3px;"><!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid #E0DBD3;padding:4px 10px;font-size:11px;color:#444;font-family:${FONT};mso-line-height-rule:exactly;line-height:16px;"><span style="font-size:6px;color:${ch.color};">&#9679;</span> ${ch.name} ${ch.count.toLocaleString()}</td></tr></table><![endif]--><!--[if !mso]><!--><table cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid #E0DBD3;padding:4px 10px;font-size:11px;color:#444;font-family:${FONT};border-radius:50px;line-height:16px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${ch.color};margin-right:4px;vertical-align:middle;"></span>${ch.name} ${ch.count.toLocaleString()}</td></tr></table><!--<![endif]--></td>`;
  }).join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="ko">
<head>
<meta charset="UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<title>RTA Studio Weekly</title>
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
<body style="margin:0;padding:0;background-color:#F0ECE4;font-family:${FONT};word-spacing:normal;color:#1B1A1E;">

<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F0ECE4;"><tr><td align="center"><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F0ECE4;">
<tr><td align="center" style="padding:32px 16px;">

<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="720" align="center" style="width:720px;"><tr><td><![endif]-->
<!-- ===== MASTER WHITE CONTAINER (wraps entire newsletter) ===== -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="720" class="email-container" style="max-width:720px;width:100%;background-color:#FFFFFF;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;box-shadow:0 2px 10px 0 rgba(27,26,30,0.06);">

<!-- Header -->
<tr><td style="padding:32px 36px 20px;border-bottom:1px solid #F0ECE4;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td style="font-family:${INTER};">
      <div style="font-size:24px;font-weight:700;color:#1B1A1E;letter-spacing:-0.6px;mso-line-height-rule:exactly;line-height:30px;">Review-to-Asset <span style="color:#EA1917;">Studio</span></div>
      <div style="font-size:13px;color:#6B6A6E;margin-top:6px;mso-line-height-rule:exactly;line-height:18px;font-weight:400;">Weekly Insight Report &nbsp;·&nbsp; <span style="color:#9B9A9E;">Turn Real Reviews into Ready-to-Use Marketing Assets.</span></div>
    </td>
    <td width="140" style="text-align:right;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right">
        <tr><td style="background:#1B1A1E;padding:8px 16px;text-align:center;font-family:${INTER};border-radius:50px;">
          <div style="font-size:10px;font-weight:700;color:#FFFFFF;letter-spacing:1.2px;mso-line-height-rule:exactly;line-height:14px;">WEEKLY REPORT</div>
          <div style="font-size:9px;color:#B5B4B8;margin-top:3px;mso-line-height-rule:exactly;line-height:13px;font-weight:400;">${d.dateRange}</div>
        </td></tr>
      </table>
    </td>
  </tr></table>
</td></tr>

<!-- Intro -->
<tr><td style="padding:20px 32px;border-bottom:1px solid #F0ECE4;font-family:${FONT};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="font-size:14px;font-weight:600;color:#1B1A1E;padding-bottom:6px;mso-line-height-rule:exactly;line-height:20px;letter-spacing:-0.2px;">고객의 생생한 목소리에서 마케팅의 해답을 찾습니다.</td></tr>
    <tr><td style="font-size:12px;color:#6B6A6E;line-height:20px;font-weight:400;">RTA Studio는 15개국, 43개+ 채널의 실사용자 리뷰를 통합 분석하여 숨겨진 인사이트를 발견하고, 즉시 활용 가능한 마케팅 에셋을 제공하는 올인원 플랫폼입니다.</td></tr>
  </table>
</td></tr>

<!-- Data Bar (LG.com beige strip) -->
<tr><td style="padding:20px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0ECE4;border-radius:24px;overflow:hidden;">
    <tr><td style="padding:14px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:12px;font-weight:600;color:#1B1A1E;font-family:${FONT};letter-spacing:-0.1px;">데이터 수집 현황</td>
        <td style="text-align:right;font-size:11px;color:#6B6A6E;font-family:${FONT};">
          <strong style="color:#EA1917;font-size:15px;font-weight:700;">${d.totalReviews.toLocaleString()}</strong>
          <span style="color:#8B8A8E;font-weight:400;">건 · ${d.productCount.toLocaleString()}개 제품</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 18px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${channelBadges}</tr></table>
    </td></tr>
  </table>
</td></tr>

<!-- KPI Pulse Row (LG.com style cards) -->
<tr><td style="padding:20px 32px 28px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td width="25%" style="padding:0 4px 0 0;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
        <tr><td style="height:4px;background:#EA1917;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:14px 12px;text-align:center;height:88px;vertical-align:middle;font-family:${INTER};">
          <div style="font-size:10px;font-weight:600;color:#8B8A8E;letter-spacing:0.4px;line-height:14px;">총 리뷰 수집</div>
          <div style="font-size:22px;font-weight:700;color:#1B1A1E;line-height:28px;margin-top:4px;letter-spacing:-0.6px;">${d.totalReviews.toLocaleString()}</div>
          <div style="font-size:10px;color:${d.wow >= 0 ? '#0D9488' : '#EA1917'};font-weight:600;margin-top:3px;">${d.wow > 0 ? '▲ +' : d.wow < 0 ? '▼ ' : ''}${d.wow}% vs 전주</div>
        </td></tr>
      </table>
    </td>
    <td width="25%" style="padding:0 4px;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
        <tr><td style="height:4px;background:#0D9488;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:14px 12px;text-align:center;height:88px;vertical-align:middle;font-family:${INTER};">
          <div style="font-size:10px;font-weight:600;color:#8B8A8E;letter-spacing:0.4px;line-height:14px;">긍정 TOP 키워드</div>
          <div style="font-size:14px;font-weight:700;color:#0D9488;line-height:20px;margin-top:6px;letter-spacing:-0.2px;">"${d.topPositiveKeyword}"</div>
          <div style="font-size:10px;color:#8B8A8E;margin-top:3px;font-weight:400;">${d.topPositiveCount}건 언급 1위</div>
        </td></tr>
      </table>
    </td>
    <td width="25%" style="padding:0 4px;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
        <tr><td style="height:4px;background:#EA1917;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:14px 12px;text-align:center;height:88px;vertical-align:middle;font-family:${INTER};">
          <div style="font-size:10px;font-weight:600;color:#8B8A8E;letter-spacing:0.4px;line-height:14px;">부정 TOP 키워드</div>
          <div style="font-size:14px;font-weight:700;color:#EA1917;line-height:20px;margin-top:6px;letter-spacing:-0.2px;">"${d.topNegativeKeyword}"</div>
          <div style="font-size:10px;color:#8B8A8E;margin-top:3px;font-weight:400;">${d.topNegativeCount}건 · FAQ 대응</div>
        </td></tr>
      </table>
    </td>
    <td width="25%" style="padding:0 0 0 4px;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
        <tr><td style="height:4px;background:#1B1A1E;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:14px 12px;text-align:center;height:88px;vertical-align:middle;font-family:${INTER};">
          <div style="font-size:10px;font-weight:600;color:#8B8A8E;letter-spacing:0.4px;line-height:14px;">주간 언급 TOP</div>
          <div style="font-size:13px;font-weight:700;color:#1B1A1E;line-height:18px;margin-top:6px;letter-spacing:-0.2px;">${d.topProduct}</div>
          <div style="font-size:10px;color:#8B8A8E;margin-top:3px;font-weight:400;">${d.topProductCount}건 · 1위</div>
        </td></tr>
      </table>
    </td>
  </tr></table>
</td></tr>

  </table>
</td></tr>
<!-- ===== END TOP STATUS BOX ===== -->

${d.opportunities.length > 0 ? `<!-- Marketing Opportunity Matrix -->
<tr><td style="padding:8px 0 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E0DBD3;border-radius:10px;overflow:hidden;">
    <tr><td style="padding:10px 14px;border-bottom:1px solid #E0DBD3;background:#EFECE5;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:12px;font-weight:800;color:#333;font-family:${INTER};">🎯 마케팅 기회 매트릭스</td>
        <td style="text-align:right;font-size:9px;color:#999;font-family:${FONT};">리뷰 기반 자동 분류</td>
      </tr></table>
    </td></tr>
    ${d.opportunities.map(op => {
      const tc = op.tag === "amplify" ? "#16a34a" : op.tag === "fix" ? "#dc2626" : "#d97706";
      const tb = op.tag === "amplify" ? "#f0fdf4" : op.tag === "fix" ? "#fef2f2" : "#fffbeb";
      const tl = op.tag === "amplify" ? "AMPLIFY" : op.tag === "fix" ? "FIX" : "WATCH";
      const dc = op.delta.includes("+") || op.delta.startsWith("▲") ? "#16a34a"
               : op.delta.includes("-") || op.delta.startsWith("▼") ? "#dc2626" : "#4A4A4A";
      return `<tr><td style="padding:0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-bottom:1px solid #E8E4DC;"><tr>
          <td width="4" style="background:${tc};font-size:0;">&nbsp;</td>
          <td style="padding:10px 14px;font-family:${FONT};">
            <div style="margin-bottom:4px;">
              <span style="font-size:9px;font-weight:700;padding:2px 6px;background:${tb};color:${tc};border:1px solid ${tc}40;">${tl}</span>
              <span style="font-size:9px;font-weight:600;padding:2px 6px;margin-left:4px;background:#EFECE5;color:#2A2A2A;border:1px solid #E0DBD3;">${op.country}</span>
              <span style="font-size:9px;font-weight:600;padding:2px 6px;margin-left:3px;background:#F5F2EC;color:#4A4A4A;border:1px solid #E0DBD3;">${op.channel}</span>
            </div>
            <div style="font-size:12px;font-weight:700;color:#1a1a1a;line-height:16px;">${op.title}</div>
            <div style="font-size:10px;color:#3A3A3A;line-height:15px;margin-top:3px;">${op.desc}</div>
          </td>
          <td width="76" style="padding:10px;text-align:right;font-family:${INTER};vertical-align:middle;">
            <div style="font-size:16px;font-weight:800;color:${dc};">${op.count}</div>
            <div style="font-size:9px;color:#4A4A4A;">건</div>
            <div style="font-size:10px;font-weight:700;color:${dc};margin-top:2px;">${op.delta}</div>
          </td>
        </tr></table>
      </td></tr>`;
    }).join("")}
  </table>
</td></tr>` : ""}

${d.trendingSignals.length > 0 ? `<!-- Trending Signals -->
<tr><td style="padding:16px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EFECE5;border:1px solid #E0DBD3;border-radius:10px;overflow:hidden;">
    <tr><td style="padding:10px 14px;border-bottom:1px solid #E0DBD3;background:#EFECE5;">
      <div style="font-size:12px;font-weight:800;color:#333;font-family:${INTER};">🔥 트렌딩 신호 — 이번 주 주목 키워드</div>
    </td></tr>
    <tr><td style="padding:12px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>${d.trendingSignals.slice(0, 3).map(sig => {
          const bc = sig.type === "rising" ? "#bbf7d0" : sig.type === "falling" ? "#fecaca" : sig.type === "new" ? "#ddd6fe" : "#e5e7eb";
          const bg = sig.type === "rising" ? "#f0fdf4" : sig.type === "falling" ? "#fef2f2" : sig.type === "new" ? "#f5f3ff" : "#fafafa";
          const bl = sig.type === "rising" ? "📈 급증" : sig.type === "falling" ? "⚠️ 주의" : sig.type === "new" ? "🆕 신규" : "— 유지";
          const blb = sig.type === "rising" ? "#dcfce7" : sig.type === "falling" ? "#fee2e2" : sig.type === "new" ? "#ede9fe" : "#f3f4f6";
          const blc = sig.type === "rising" ? "#16a34a" : sig.type === "falling" ? "#dc2626" : sig.type === "new" ? "#7c3aed" : "#4A4A4A";
          const vc = sig.sentiment === "positive" ? "#16a34a" : sig.sentiment === "negative" ? "#dc2626" : "#1a1a1a";
          const dtc = sig.delta > 0 ? "#16a34a" : sig.delta < 0 ? "#dc2626" : "#4A4A4A";
          // Truncate long keywords for height consistency (3-line max ≈ 60 chars)
          const kw = sig.keyword.length > 60 ? sig.keyword.slice(0, 57) + "..." : sig.keyword;
          return `<td width="33%" style="padding:0 3px;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" height="120" style="border:1px solid ${bc};background:${bg};height:120px;">
              <tr><td valign="top" style="padding:10px;font-family:${INTER};height:120px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                  <td style="font-size:12px;font-weight:800;color:#1a1a1a;line-height:16px;height:48px;vertical-align:top;">"${kw}"</td>
                  <td width="48" style="text-align:right;vertical-align:top;"><span style="font-size:8px;font-weight:700;padding:2px 4px;background:${blb};color:${blc};white-space:nowrap;">${bl}</span></td>
                </tr></table>
                <div style="font-size:18px;font-weight:800;color:${vc};margin-top:5px;">${sig.count}<span style="font-size:10px;color:#4A4A4A;font-weight:400;"> 건</span></div>
                <div style="font-size:10px;font-weight:600;color:${dtc};margin-top:2px;">${sig.delta > 0 ? "▲ +" + sig.delta + "%" : sig.delta < 0 ? "▼ " + sig.delta + "%" : "— 변동 미미"} vs 전주</div>
              </td></tr>
            </table>
          </td>`;
        }).join("")}</tr>
      </table>
    </td></tr>
  </table>
</td></tr>` : ""}

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
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E0DBD3;background:#EFECE5;">
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
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EFECE5;border:1px solid #E0DBD3;border-radius:10px;overflow:hidden;">
    <tr><td colspan="3" style="height:4px;background:#A50034;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr>
    <tr>
      <td width="180" style="padding:20px 16px;vertical-align:middle;">
        <table role="presentation" cellpadding="0" cellspacing="4" border="0"><tr>
          <td width="54" height="48" style="background:#EFECE5;border:1px solid #E8E4DC;text-align:center;vertical-align:middle;font-family:${FONT};"><div style="font-size:16px;">📊</div><div style="font-size:7px;color:#999;">리뷰 분석</div></td>
          <td width="54" height="48" style="background:#EFECE5;border:1px solid #E8E4DC;text-align:center;vertical-align:middle;font-family:${FONT};"><div style="font-size:16px;">⚡</div><div style="font-size:7px;color:#999;">광고 카피</div></td>
          <td width="54" height="48" style="background:#EFECE5;border:1px solid #E8E4DC;text-align:center;vertical-align:middle;font-family:${FONT};"><div style="font-size:16px;">❓</div><div style="font-size:7px;color:#999;">FAQ</div></td>
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
    <td style="font-family:${INTER};"><div style="font-size:11px;font-weight:700;color:#1a1a1a;mso-line-height-rule:exactly;line-height:16px;">Review-to-Asset Studio</div><div style="font-size:9px;color:#999;margin-top:2px;mso-line-height-rule:exactly;line-height:14px;">Produced by LG전자 D2C마케팅전략팀</div></td>
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

    // 메인 대시보드와 동일하게 — 최신 snapshot_date의 trending_keywords만 사용
    const { data: latestKwRow } = await sb
      .from("trending_keywords")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const latestKwDate = (latestKwRow as any)?.snapshot_date;

    let kwQuery = sb
      .from("trending_keywords")
      .select("keyword, count, sentiment, change_percent")
      .order("count", { ascending: false })
      .limit(30);
    if (latestKwDate) kwQuery = kwQuery.eq("snapshot_date", latestKwDate);

    const [weeklyRes, lastWeekRes, totalRes, productRes, keywordsRes, trendingRes] = await Promise.all([
      sb.from("reviews").select("*", { count: "exact", head: true }).gte("published_at", weekAgo.toISOString()),
      sb.from("reviews").select("*", { count: "exact", head: true }).gte("published_at", twoWeeksAgo.toISOString()).lt("published_at", weekAgo.toISOString()),
      sb.from("reviews").select("*", { count: "exact", head: true }),
      sb.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
      kwQuery,
      sb.from("trending_snapshots").select("product_id, mention_count, change_percent, trend, products!inner(display_name, model_number, is_active)").eq("products.is_active", true).order("mention_count", { ascending: false }).limit(10),
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

    // Keywords
    const kws = keywordsRes.data || [];
    const posKws = kws.filter((k: any) => k.sentiment === "positive").sort((a: any, b: any) => b.count - a.count);
    const negKws = kws.filter((k: any) => k.sentiment === "negative").sort((a: any, b: any) => b.count - a.count);

    // Top product
    const trendProds = trendingRes.data || [];
    const topProd = trendProds[0];

    // Opportunities — Dashboard와 동일하게 amplify/fix/watch를 다양하게 구성
    // 주간 리뷰에서 product × source × sentiment 별로 집계해서 다양한 시그널 추출
    const SOURCE_TO_FLAG: Record<string, string> = {
      lge_com_us: "🇺🇸 US", lge_com_uk: "🇬🇧 UK", lge_com_de: "🇩🇪 DE",
      lge_com_au: "🇦🇺 AU", lge_com_in: "🇮🇳 IN", lge_com_tw: "🇹🇼 TW",
      lge_com_jp: "🇯🇵 JP", lge_com_th: "🇹🇭 TH", lge_com_br: "🇧🇷 BR",
      reddit: "🌐 Global", youtube: "🌐 Global", trustpilot: "🌐 Global",
    };
    const sourceCountry = (s: string) => {
      if (SOURCE_TO_FLAG[s]) return SOURCE_TO_FLAG[s];
      if (s?.startsWith("lge_com_")) return "🌍 " + s.replace("lge_com_", "").toUpperCase();
      return "🌐 Global";
    };
    const sourceChannel = (s: string) => {
      if (s?.startsWith("lge_com")) return "LG.com";
      if (s?.startsWith("reddit")) return "Reddit";
      if (s?.startsWith("youtube")) return "YouTube";
      return s || "기타";
    };

    // 최근 7일 리뷰를 product+source+sentiment 단위로 집계
    const { data: weeklyAgg } = await sb
      .from("reviews")
      .select("product_id, source, sentiment, products!inner(display_name, category, is_active)")
      .gte("published_at", weekAgo.toISOString())
      .eq("products.is_active", true)
      .limit(5000);

    type Bucket = {
      productId: string; name: string; category: string;
      bestSource: string; pos: number; neg: number; total: number;
      sourceCounts: Record<string, number>;
    };
    const bucketMap: Record<string, Bucket> = {};
    for (const r of (weeklyAgg ?? []) as any[]) {
      const id = r.product_id as string;
      if (!bucketMap[id]) {
        bucketMap[id] = {
          productId: id,
          name: r.products?.display_name || "Unknown",
          category: r.products?.category || "General",
          bestSource: r.source, pos: 0, neg: 0, total: 0,
          sourceCounts: {},
        };
      }
      const b = bucketMap[id];
      b.total += 1;
      if (r.sentiment === "positive") b.pos += 1;
      else if (r.sentiment === "negative") b.neg += 1;
      b.sourceCounts[r.source] = (b.sourceCounts[r.source] ?? 0) + 1;
      // 가장 많이 수집된 소스를 대표 소스로
      if (b.sourceCounts[r.source] > (b.sourceCounts[b.bestSource] ?? 0)) b.bestSource = r.source;
    }
    const buckets = Object.values(bucketMap).filter(b => b.total >= 3);

    const opportunities: { tag: string; title: string; desc: string; count: number; delta: string; country: string; channel: string }[] = [];

    // AMPLIFY: 긍정 비율 ≥70% & 긍정 ≥5건 → 상위 2건
    const amplifyCands = buckets
      .filter(b => b.total >= 5 && b.pos / b.total >= 0.7)
      .sort((a, b) => b.pos - a.pos);
    for (const b of amplifyCands.slice(0, 2)) {
      const posRate = Math.round((b.pos / b.total) * 100);
      opportunities.push({
        tag: "amplify",
        title: b.name,
        desc: `${b.category} · 긍정 ${posRate}% (${b.pos}건) — PMAX/Affiliate 즉시 활용 권고`,
        count: b.pos,
        delta: `▲ +${posRate}%`,
        country: sourceCountry(b.bestSource),
        channel: sourceChannel(b.bestSource),
      });
    }

    // FIX: 부정 비율 ≥35% & 부정 ≥3건 → 상위 2건
    const fixCands = buckets
      .filter(b => b.total >= 4 && b.neg / b.total >= 0.35 && b.neg >= 3)
      .sort((a, b) => b.neg - a.neg);
    for (const b of fixCands.slice(0, 2)) {
      const negRate = Math.round((b.neg / b.total) * 100);
      opportunities.push({
        tag: "fix",
        title: b.name,
        desc: `${b.category} · 부정 ${negRate}% (${b.neg}건) — FAQ/PDP 보강 및 CRITEO 일시 중단 권고`,
        count: b.neg,
        delta: `▲ ${negRate}%`,
        country: sourceCountry(b.bestSource),
        channel: sourceChannel(b.bestSource),
      });
    }

    // WATCH: 언급 다수지만 명확한 호/불호 판단 어려운 제품 (중립/혼조) → 상위 2건
    const used = new Set(opportunities.map(o => o.title));
    const watchCands = buckets
      .filter(b => !used.has(b.name) && b.total >= 5)
      .sort((a, b) => b.total - a.total);
    for (const b of watchCands.slice(0, 2)) {
      const posRate = Math.round((b.pos / b.total) * 100);
      const negRate = Math.round((b.neg / b.total) * 100);
      let reason = "혼조 시그널 — 추가 데이터 확보 후 재평가";
      if (negRate >= 20 && posRate >= 50) reason = `긍정 ${posRate}% / 부정 ${negRate}% — 부정 사유 카테고라이즈 후 액션 결정`;
      else if (b.total >= 10 && posRate < 60 && negRate < 30) reason = `언급 ${b.total}건 / 명확한 호불호 신호 부족 — 키워드 클러스터링 필요`;
      else if (b.pos > b.neg) reason = `긍정 우세지만 표본 부족 — 차주 데이터 누적 후 AMPLIFY 재검토`;
      opportunities.push({
        tag: "watch",
        title: b.name,
        desc: `${b.category} · ${reason}`,
        count: b.total,
        delta: `— 모니터링`,
        country: sourceCountry(b.bestSource),
        channel: sourceChannel(b.bestSource),
      });
    }

    // 폴백 — 데이터가 부족하면 trending_snapshots 사용
    if (opportunities.length === 0) {
      for (const tp of trendProds.slice(0, 3)) {
        const prod = (tp as any).products;
        const chg = Number(tp.change_percent) || 0;
        const tag = chg > 10 ? "amplify" : chg < -10 ? "fix" : "watch";
        opportunities.push({
          tag,
          title: prod?.display_name || "Unknown",
          desc: tag === "amplify" ? "긍정 트렌드 — 마케팅 소재 활용 권고"
              : tag === "fix" ? "부정 급증 — CS/FAQ 즉시 대응 필요"
              : `언급량 ${tp.mention_count}건 / 변화율 ${chg}% — 트렌드 안정 구간, 차주 모니터링`,
          count: tp.mention_count,
          delta: (chg > 0 ? "+" : "") + chg + "%",
          country: "🌐 Global",
          channel: "Trending",
        });
      }
    }

    // Trending signals — 메인 대시보드 TrendingDashboard와 동일한 분류 규칙 + 상위 3개만
    const trendingSignals = [...posKws, ...negKws]
      .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      .slice(0, 3)
      .map((k: any) => {
        const change = Number(k.change_percent) || 0;
        const count = Number(k.count) || 0;
        const type = change > 20 ? "rising"
          : change < -10 ? "falling"
          : count <= 5 ? "new"
          : "stable";
        return {
          keyword: k.keyword,
          count,
          delta: Math.round(change),
          type,
          sentiment: k.sentiment,
        };
      });

    const newsletterData = {
      dateRange, generatedAt,
      weeklyReviews: weeklyRes.count || 0, wow,
      totalReviews: totalRes.count || 0,
      productCount: productRes.count || 0,
      channels: topChannels,
      topPositiveKeyword: posKws[0]?.keyword || "—",
      topPositiveCount: posKws[0]?.count || 0,
      topNegativeKeyword: negKws[0]?.keyword || "—",
      topNegativeCount: negKws[0]?.count || 0,
      topProduct: (topProd as any)?.products?.display_name || "—",
      topProductCount: topProd?.mention_count || 0,
      opportunities,
      trendingSignals,
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

    if (format === "json") {
      return new Response(JSON.stringify({ html, data: newsletterData, lgcomInsight, redditInsight }), {
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
