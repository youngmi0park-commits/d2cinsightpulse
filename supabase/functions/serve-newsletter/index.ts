import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChannelInsight {
  top_products: { rank: number; name: string; category: string; mention_count: number; pos_summary: string; neg_summary: string; praise_points: string[] }[];
  top_topics: { rank: number; topic: string; mention_pct: number; positive_pct: number; negative_pct: number; representative_comment: string; related_products: string[]; related_countries?: string[] }[];
  urgent_issues: { rank: number; issue: string; mention_pct: number; pattern: string; cause: string; related_products: string[]; related_countries?: string[] }[];
  recurring_praise: { text: string; product?: string; category?: string }[];
  key_takeaway?: { product: string; category: string; positive_msg: string; negative_msg: string; marketer_action: string }[];
}

interface AllChannelSummary {
  top_products: { name: string; category: string; positive_msg: string; negative_msg: string }[];
  key_takeaway: string;
  community_weekly: string;
}

/* ── AI insight generation per channel ── */
async function generateChannelInsight(sb: any, lovableApiKey: string, channel: "lgcom" | "reddit" | "community"): Promise<ChannelInsight | null> {
  const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString();
  let query = sb
    .from("reviews")
    .select("title, content, sentiment, sentiment_score, rating, source, products!inner(display_name, model_number, category, sub_category)")
    .gte("published_at", weekAgoStr)
    .order("published_at", { ascending: false })
    .limit(800);

  if (channel === "lgcom") query = query.like("source", "lge_com%");
  else if (channel === "reddit") query = query.like("source", "reddit%");
  else {
    // community: Amazon, YouTube, Trustpilot, BestBuy, Shopee, Lazada, etc. (exclude LG.com and ALL reddit_* variants)
    query = query.not("source", "like", "lge_com%").not("source", "like", "reddit%");
  }

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

  const channelLabel = channel === "lgcom" ? "LG.com 공식 리뷰" : channel === "reddit" ? "Reddit 및 커뮤니티" : "Amazon/YouTube/Trustpilot 등 외부 커뮤니티";

  const systemPrompt = `You are an expert consumer insight analyst for LG Electronics D2C marketing team. Analyze ${channelLabel} data and provide structured weekly insight in BOTH Korean and English.

🎯 COPY-WRITING RULE (CRITICAL): For all marketing copy fields (headlines, taglines, ad copy, recommended messages, FAQ answers), MINIMIZE explicit product/model name mentions. Lead with USER BENEFITS, EMOTIONAL HOOKS, and PROOF POINTS — not product names. Mention a specific model name AT MOST ONCE per copy block, only when essential. For data fields like top_products listings, real product names ARE required (those are data, not marketing copy).

Be specific, actionable, and let the persuasion come from value, not from name recall.`;

  const userPrompt = `다음은 ${channelLabel}의 최근 수집된 리뷰 데이터입니다:

총 리뷰: ${reviews.length}건 (긍정 ${posReviews.length}건, 부정 ${negReviews.length}건)

제품별 현황:
${productSummary}

위 데이터를 분석하여 아래 5가지 섹션을 **한국어(_ko)와 영어(_en) 둘 다** 작성해주세요. 한국어가 메인, 영어는 짧고 자연스러운 비즈니스 톤으로:

## 1. 가장 많이 언급된 제품 TOP 5 (top_products)
각 제품별:
- rank, name, category, mention_count
- pos_summary (한 문장 60자 이내) + pos_summary_en (한 문장 90자 이내, 영어)
- neg_summary (50자 이내) + neg_summary_en (80자 이내) — 또는 빈문자열
- praise_points: 정확히 3개, 각 8자 이내 짧은 한국어 키워드
- praise_points_en: 정확히 3개, 각 14자 이내 짧은 영어 키워드

## 2. 고객이 가장 많이 말하는 주제 TOP 3 (top_topics)
각 주제별:
- rank, topic (한국어 12자 이내), topic_en (English, ≤22 chars), mention_pct, positive_pct, negative_pct
- representative_comment (한 문장 45자 이내) + representative_comment_en (≤80 chars)
- related_products

## 3. 개선 시급 이슈 TOP 3 (urgent_issues)
- rank, issue + issue_en (각 15/25자 이내), mention_pct
- pattern + pattern_en (각 25/45자 이내)
- cause + cause_en (각 25/45자 이내)
- related_products

## 4. 반복 칭찬 포인트 5개 (recurring_praise)
- 각 항목 { "text": "20자 이내 한국어 칭찬", "text_en": "≤32 chars English praise", "product": "제품명", "category": "카테고리" }

## 5. KEY TAKEAWAY — 카테고리별 마케터 인사이트 (key_takeaway)
- **카테고리별로 1개씩** (실제 데이터에 존재하는 카테고리만), 동일 카테고리 중복 금지
- 최대 8개까지, 언급량 기준 내림차순
- 형태: { "product", "category", "positive_msg", "positive_msg_en", "negative_msg", "negative_msg_en", "marketer_action", "marketer_action_en" }

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
  return safeParseInsight(content);
}

/* ── Robust JSON extractor (handles markdown fences, trailing commas, truncation) ── */
function safeParseInsight(raw: string): ChannelInsight | null {
  if (!raw) return null;
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  if (!cleaned) return null;
  const start = cleaned.search(/[\{\[]/);
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  cleaned = cleaned.substring(start, end + 1);
  try { return JSON.parse(cleaned); }
  catch {
    try {
      const fixed = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      return JSON.parse(fixed);
    } catch { return null; }
  }
}

/* ── Deterministic fallback insight from raw reviews (used when AI fails) ── */
async function buildFallbackInsight(sb: any, channel: "lgcom" | "reddit" | "community" | "reddit_plus_community"): Promise<ChannelInsight | null> {
  const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString();
  // Reddit/community frequently have NULL published_at — use collected_at as the safe weekly window
  const buildQuery = (useCollected: boolean) => {
    const dateCol = useCollected ? "collected_at" : "published_at";
    let q = sb.from("reviews")
      .select("title, content, sentiment, source, products!inner(display_name, category)")
      .gte(dateCol, weekAgoStr)
      .order(dateCol, { ascending: false })
      .limit(600);
    if (channel === "lgcom") q = q.like("source", "lge_com%");
    else if (channel === "reddit") q = q.like("source", "reddit%");
    else if (channel === "community") q = q.not("source", "like", "lge_com%").not("source", "like", "reddit%");
    else q = q.not("source", "like", "lge_com%"); // reddit + community
    return q;
  };

  // Try published_at first; if empty, retry with collected_at (covers Reddit/YouTube/community)
  let { data: reviews } = await buildQuery(false);
  if (!reviews?.length) {
    const retry = await buildQuery(true);
    reviews = retry.data;
  }
  if (!reviews?.length) return null;

  const byProduct: Record<string, { name: string; cat: string; pos: number; neg: number; posT: string[]; negT: string[] }> = {};
  for (const r of reviews as any[]) {
    const name = r.products?.display_name || "Unknown";
    const cat = r.products?.category || "General";
    if (!byProduct[name]) byProduct[name] = { name, cat, pos: 0, neg: 0, posT: [], negT: [] };
    const p = byProduct[name];
    if (r.sentiment === "positive") { p.pos++; if (r.title && p.posT.length < 5) p.posT.push(r.title); }
    else if (r.sentiment === "negative") { p.neg++; if (r.title && p.negT.length < 5) p.negT.push(r.title); }
  }
  const top = Object.values(byProduct).sort((a, b) => (b.pos + b.neg) - (a.pos + a.neg)).slice(0, 5);
  return {
    top_products: top.map((p, i) => ({
      rank: i + 1,
      name: p.name,
      category: p.cat,
      mention_count: p.pos + p.neg,
      pos_summary: p.posT[0] || "긍정 코멘트 수집 중",
      neg_summary: p.negT[0] || "",
      praise_points: p.posT.slice(0, 3).map(t => t.slice(0, 12)),
    })),
    top_topics: [],
    urgent_issues: [],
    recurring_praise: top.flatMap(p => p.posT.slice(0, 1).map(t => ({ text: t.slice(0, 24), product: p.name, category: p.cat }))).slice(0, 5),
  };
}

/* ── Merge two ChannelInsights into one combined view (reddit + community) ── */
function mergeChannelInsights(a: ChannelInsight | null, b: ChannelInsight | null): ChannelInsight | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  const mergedProducts = [...(a.top_products || []), ...(b.top_products || [])]
    .reduce((acc: any[], p) => {
      const existing = acc.find(x => x.name === p.name);
      if (existing) existing.mention_count += p.mention_count;
      else acc.push({ ...p });
      return acc;
    }, [])
    .sort((x, y) => (y.mention_count || 0) - (x.mention_count || 0))
    .slice(0, 5)
    .map((p, i) => ({ ...p, rank: i + 1 }));
  const mergedTopics = [...(a.top_topics || []), ...(b.top_topics || [])]
    .sort((x, y) => (y.mention_pct || 0) - (x.mention_pct || 0))
    .slice(0, 3)
    .map((t, i) => ({ ...t, rank: i + 1 }));
  const mergedIssues = [...(a.urgent_issues || []), ...(b.urgent_issues || [])]
    .sort((x, y) => (y.mention_pct || 0) - (x.mention_pct || 0))
    .slice(0, 3)
    .map((iss, i) => ({ ...iss, rank: i + 1 }));
  const mergedPraise = [...(a.recurring_praise || []), ...(b.recurring_praise || [])].slice(0, 5);
  const mergedKT = [...(a.key_takeaway || []), ...(b.key_takeaway || [])];
  return {
    top_products: mergedProducts,
    top_topics: mergedTopics,
    urgent_issues: mergedIssues,
    recurring_praise: mergedPraise,
    key_takeaway: mergedKT,
  };
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
  const raw = aiData.choices?.[0]?.message?.content || "{}";
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  if (!cleaned) return null;
  const start = cleaned.search(/[\{\[]/);
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  cleaned = cleaned.substring(start, end + 1);
  try { return JSON.parse(cleaned); }
  catch {
    try { return JSON.parse(cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "")); }
    catch { return null; }
  }
}

/* ── Newsletter HTML builder ── */
function buildNewsletterHTML(d: {
  dateRange: string; generatedAt: string;
  weeklyReviews: number; wow: number;
  totalReviews: number; productCount: number;
  channels: { name: string; count: number; weeklyCount: number; color: string }[];
  topPositiveKeyword: string; topPositiveCount: number;
  topNegativeKeyword: string; topNegativeCount: number;
  topProduct: string; topProductCount: number;
  opportunities: { tag: string; title: string; desc: string; count: number; delta: string; country: string; channel: string }[];
  trendingSignals: { keyword: string; count: number; delta: number; type: string; sentiment: string }[];
  regionalSignals: { country: string; flag: string; total: number; posPct: number; negPct: number; topCategory: string; signal: string }[];
  actionChecklist: { priority: "HIGH" | "MID" | "LOW"; channel: string; action: string; basis: string; owner: string }[];
}, lgcom: ChannelInsight | null, reddit: ChannelInsight | null, baseUrl: string, allChannel: AllChannelSummary | null, community: ChannelInsight | null = null): string {

  // LG.com Design System tokens (LGEI Text fallback chain → Inter → Noto Sans KR → system)
  const FONT = "'LGEI Text','LG SmHaT','Inter','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo','Segoe UI',Arial,sans-serif";
  const INTER = "'LGEI Text','LG SmHaT','Inter','Segoe UI',Arial,sans-serif";

  // Bilingual helper — renders both KO and EN spans; CSS toggles visibility
  const bi = (ko: string, en?: string) => {
    const enText = en && en.trim() ? en : ko;
    return `<span class="lg-ko">${ko}</span><span class="lg-en" style="display:none;">${enText}</span>`;
  };

  // Format date range for header weekly meta — "APR 14 — APR 21, 2026" + compact "04.14 — 04.21"
  const MONTHS_EN = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const _now = new Date();
  const _weekAgo = new Date(_now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const _pad = (n: number) => String(n).padStart(2, "0");
  const weeklyDateFull = `${MONTHS_EN[_weekAgo.getMonth()]} ${_pad(_weekAgo.getDate())} — ${MONTHS_EN[_now.getMonth()]} ${_pad(_now.getDate())}, ${_now.getFullYear()}`;
  const weeklyDateCompact = `${_pad(_weekAgo.getMonth() + 1)}.${_pad(_weekAgo.getDate())} — ${_pad(_now.getMonth() + 1)}.${_pad(_now.getDate())}`;

  /* ── Key Takeaway block — 카테고리별 1개씩 (중복 제거) ── */
  function renderKeyTakeaway(label: string, icon: string, borderColor: string, insight: ChannelInsight | null) {
    const raw = insight?.key_takeaway;
    if (!raw || raw.length === 0) return "";
    const seen = new Set<string>();
    const items = raw.filter(it => {
      const key = (it.category || "기타").trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
    if (items.length === 0) return "";
    const rows = items.map((item, idx) => `
      <tr><td style="padding:14px 18px;${idx < items.length - 1 ? "border-bottom:1px solid #F0ECE4;" : ""}font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="padding-bottom:6px;">
            <!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#F0ECE4;padding:3px 10px;font-size:10px;font-weight:700;color:#1B1A1E;mso-line-height-rule:exactly;line-height:14px;">${item.category}</td><td style="padding-left:8px;font-weight:700;font-size:12.5px;color:#1B1A1E;">${item.product}</td></tr></table><![endif]-->
            <!--[if !mso]><!--><span style="display:inline-block;background:#F0ECE4;border-radius:50px;padding:3px 10px;font-size:10px;font-weight:700;color:#1B1A1E;margin-right:8px;letter-spacing:0.2px;">${item.category}</span><span style="font-weight:700;font-size:12.5px;color:#1B1A1E;letter-spacing:-0.1px;">${item.product}</span><!--<![endif]-->
          </td>
        </tr></table>
        ${item.positive_msg ? `<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:11px;color:#0D9488;padding-bottom:3px;font-family:${FONT};font-weight:500;line-height:16px;">👍 ${bi(item.positive_msg, (item as any).positive_msg_en)}</td></tr></table>` : ""}
        ${item.negative_msg ? `<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-size:11px;color:#EA1917;padding-bottom:6px;font-family:${FONT};font-weight:500;line-height:16px;">👎 ${bi(item.negative_msg, (item as any).negative_msg_en)}</td></tr></table>` : ""}
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr><td style="background:#FFFBEB;padding:8px 12px;font-family:${FONT};border-radius:12px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="font-size:10px;font-weight:700;color:#D97706;padding-bottom:3px;letter-spacing:0.3px;">🎯 ${bi("마케팅 액션", "Marketing Action")}</td></tr>
              <tr><td style="font-size:11px;color:#1B1A1E;line-height:17px;font-weight:400;">${bi(item.marketer_action, (item as any).marketer_action_en)}</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>`).join("");

    return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:18px;mso-table-lspace:0pt;mso-table-rspace:0pt;">
      <tr><td style="padding-left:10px;border-left:4px solid ${borderColor};font-size:12px;font-weight:700;color:#1B1A1E;padding-bottom:10px;font-family:${INTER};letter-spacing:-0.1px;">${icon} ${label}</td></tr>
      <tr><td>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E5DFD3;background:#FFFFFF;border-radius:20px;overflow:hidden;mso-table-lspace:0pt;mso-table-rspace:0pt;">${rows}</table>
      </td></tr>
    </table>`;
  }

  /* ── Channel section HTML ── */
  function channelSectionHTML(label: string, icon: string, insight: ChannelInsight | null) {
    if (!insight) return `
    <tr><td style="padding:24px 32px 0;font-family:${FONT};">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:14px;font-weight:800;color:#EA1917;padding-bottom:8px;font-family:${INTER};letter-spacing:-0.2px;">${icon} ${label}</td></tr>
        <tr><td style="text-align:center;padding:28px;color:#8B8A8E;font-size:12px;border:1px solid #E5DFD3;background:#FAF7F0;border-radius:20px;">${bi("데이터 없음", "No data available")}</td></tr>
      </table>
    </td></tr>`;

    const trim = (s: string | undefined, n: number) => {
      if (!s) return "";
      const t = String(s).replace(/\s+/g, " ").trim();
      return t.length > n ? t.slice(0, n - 1) + "…" : t;
    };

    // Top products — 카드 (rounded)
    const productsList = (insight.top_products || []).slice(0, 5);
    const productsHTML = productsList.map((p, idx) => `
      <tr><td style="padding:12px 16px;${idx < productsList.length - 1 ? "border-bottom:1px solid #F0ECE4;" : ""}font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="30" valign="top" style="padding-top:1px;">
            <!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:24px;height:24px;background:#EA1917;color:#ffffff;font-size:11px;font-weight:800;text-align:center;mso-line-height-rule:exactly;line-height:24px;">${p.rank}</td></tr></table><![endif]-->
            <!--[if !mso]><!--><div style="width:24px;height:24px;background:#EA1917;border-radius:50%;color:#fff;font-size:11px;font-weight:800;text-align:center;line-height:24px;">${p.rank}</div><!--<![endif]-->
          </td>
          <td style="padding-left:12px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="font-weight:700;font-size:12.5px;color:#1B1A1E;padding-bottom:2px;font-family:${FONT};letter-spacing:-0.1px;">${p.name} <span style="font-weight:500;font-size:10px;color:#6B6A6E;">· ${p.category} · ${String(p.mention_count).replace(/건/g, "")} ${bi("건", "mentions")}</span></td></tr>
              <tr><td style="padding-top:6px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0FDFA;border-left:3px solid #0D9488;border-radius:8px;overflow:hidden;">
                  <tr><td style="padding:7px 11px;font-size:11px;color:#1B1A1E;line-height:17px;font-family:${FONT};"><span style="color:#0D9488;font-weight:700;">👍</span> ${bi(trim(p.pos_summary, 70), trim((p as any).pos_summary_en, 110))}</td></tr>
                </table>
              </td></tr>
              ${p.neg_summary && p.neg_summary !== "특이 불만 없음" ? `
              <tr><td style="padding-top:5px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FEF2F2;border-left:3px solid #EA1917;border-radius:8px;overflow:hidden;">
                  <tr><td style="padding:7px 11px;font-size:11px;color:#1B1A1E;line-height:17px;font-family:${FONT};"><span style="color:#EA1917;font-weight:700;">👎</span> ${bi(trim(p.neg_summary, 60), trim((p as any).neg_summary_en, 100))}</td></tr>
                </table>
              </td></tr>` : ""}
              ${(p.praise_points || []).length > 0 ? `
              <tr><td style="padding-top:6px;font-family:${FONT};">
                ${p.praise_points.slice(0, 3).map((pp, i) => {
                  const enPp = ((p as any).praise_points_en || [])[i];
                  return `<table cellpadding="0" cellspacing="0" border="0" style="display:inline-block;mso-table-lspace:0pt;mso-table-rspace:0pt;margin:1px 4px 1px 0;"><tr><td style="background:#F0ECE4;border:1px solid #E5DFD3;padding:2px 8px;font-size:10px;color:#1B1A1E;border-radius:50px;font-weight:500;">✅ ${bi(trim(pp, 12), trim(enPp, 18))}</td></tr></table>`;
                }).join("")}
              </td></tr>` : ""}
            </table>
          </td>
        </tr></table>
      </td></tr>`).join("");

    // Top topics — rounded
    const topicsList = (insight.top_topics || []).slice(0, 3);
    const topicsHTML = topicsList.map((t, idx) => `
      <tr><td style="padding:10px 16px;${idx < topicsList.length - 1 ? "border-bottom:1px solid #F0ECE4;" : ""}font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-weight:700;font-size:12px;color:#1B1A1E;letter-spacing:-0.1px;">${t.rank}. ${bi(trim(t.topic, 18), trim((t as any).topic_en, 28))}</td>
            <td align="right" style="font-size:10px;color:#6B6A6E;white-space:nowrap;font-weight:500;"><span style="color:#0D9488;font-weight:700;">${bi("긍정", "Pos")} ${String(t.positive_pct).replace(/%/g, "")}%</span> · ${String(t.mention_pct).replace(/%/g, "")}%</td>
          </tr>
          <tr><td colspan="2" style="padding-top:5px;"><div style="font-size:10.5px;color:#4A4A4A;font-style:italic;background:#F0ECE4;padding:6px 10px;line-height:15px;border-radius:8px;font-weight:400;">"${bi(trim(t.representative_comment, 55), trim((t as any).representative_comment_en, 90))}"</div></td></tr>
        </table>
      </td></tr>`).join("");

    // Urgent issues
    const issuesList = (insight.urgent_issues || []).slice(0, 3);
    const issuesHTML = issuesList.map((iss, idx) => `
      <tr><td style="padding:10px 16px;${idx < issuesList.length - 1 ? "border-bottom:1px solid #FEE2E2;" : ""}font-family:${FONT};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="font-weight:700;font-size:12px;color:#EA1917;padding-bottom:3px;letter-spacing:-0.1px;">⚠️ ${iss.rank}. ${bi(trim(iss.issue, 20), trim((iss as any).issue_en, 32))} <span style="color:#8B8A8E;font-weight:500;">(${iss.mention_pct}%)</span></td></tr>
          <tr><td style="font-size:10.5px;color:#1B1A1E;line-height:15px;font-weight:400;">${bi(trim(iss.pattern, 35), trim((iss as any).pattern_en, 55))} · <span style="color:#6B6A6E;">${bi(trim(iss.cause, 35), trim((iss as any).cause_en, 55))}</span></td></tr>
        </table>
      </td></tr>`).join("");

    const praiseRows = (insight.recurring_praise || []).slice(0, 5).map(p => {
      const item = typeof p === "string" ? ({ text: p } as any) : p;
      return `<tr><td style="padding:3px 0;font-size:11px;color:#0D9488;line-height:16px;font-family:${FONT};font-weight:500;">✅ ${item.product ? `<strong style="color:#1B1A1E;">${item.product}</strong> — ` : ""}${bi(trim(item.text, 30), trim(item.text_en, 48))}</td></tr>`;
    }).join("");

    return `
    <tr><td style="padding:20px 32px 0;font-family:${FONT};">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:14px;font-weight:800;color:#EA1917;padding-bottom:12px;font-family:${INTER};letter-spacing:-0.2px;">${icon} ${label}</td></tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:11px;font-weight:700;color:#1B1A1E;padding-bottom:6px;font-family:${FONT};letter-spacing:0.2px;">📦 ${bi("가장 많이 언급된 제품", "Most Mentioned Products")}</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E5DFD3;background:#FFFFFF;border-radius:20px;overflow:hidden;margin-bottom:14px;mso-table-lspace:0pt;mso-table-rspace:0pt;">${productsHTML}</table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:11px;font-weight:700;color:#1B1A1E;padding-bottom:6px;font-family:${FONT};letter-spacing:0.2px;">🔥 ${bi("주요 키워드 TOP 3", "Top 3 Topics")}</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E5DFD3;background:#FFFFFF;border-radius:20px;overflow:hidden;margin-bottom:14px;mso-table-lspace:0pt;mso-table-rspace:0pt;">${topicsHTML}</table>

      ${issuesHTML ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="font-size:11px;font-weight:700;color:#EA1917;padding-bottom:6px;font-family:${FONT};letter-spacing:0.2px;">🚨 ${bi("개선 시급 이슈", "Urgent Issues to Fix")}</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #FECACA;background:#FFFBFB;border-radius:20px;overflow:hidden;margin-bottom:14px;mso-table-lspace:0pt;mso-table-rspace:0pt;">${issuesHTML}</table>` : ""}

      ${praiseRows ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:20px;overflow:hidden;margin-bottom:8px;mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr><td style="padding:14px 18px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="font-size:11px;font-weight:700;color:#0D9488;padding-bottom:8px;font-family:${FONT};letter-spacing:0.2px;">🏆 ${bi("반복 칭찬 포인트", "Recurring Praise")}</td></tr>
            ${praiseRows}
          </table>
        </td></tr>
      </table>` : ""}
    </td></tr>`;
  }

  /* ── Channel badges ── */
  const visibleChannels = d.channels
    .filter(ch => (ch.weeklyCount ?? 0) > 0)
    .sort((a, b) => (b.weeklyCount ?? 0) - (a.weeklyCount ?? 0));
  const channelCount = Math.max(visibleChannels.length, 1);
  const colWidthPct = (100 / channelCount).toFixed(4);
  const channelBadges = visibleChannels.map(ch => {
    const weekly = (ch.weeklyCount ?? 0).toLocaleString();
    const total = ch.count.toLocaleString();
    return `<td width="${colWidthPct}%" style="padding:0 3px;vertical-align:top;"><!--[if mso]><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" style="border:1px solid #E0DBD3;background:#FFFFFF;padding:6px 8px;font-size:11px;color:#1B1A1E;font-family:${FONT};mso-line-height-rule:exactly;line-height:14px;"><span style="font-size:6px;color:${ch.color};">&#9679;</span> <strong>${ch.name}</strong> ${weekly}<br/><span style="color:#9A9A9A;font-size:10px;">${bi("누적", "Total")} ${total}</span></td></tr></table><![endif]--><!--[if !mso]><!--><table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;"><tr><td align="center" style="border:1px solid #E0DBD3;background:#FFFFFF;padding:6px 8px;font-size:11px;color:#1B1A1E;font-family:${FONT};border-radius:14px;line-height:14px;text-align:center;white-space:nowrap;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${ch.color};margin-right:5px;vertical-align:middle;"></span><strong style="font-weight:700;">${ch.name}</strong> <span style="font-weight:700;">${weekly}</span><div style="color:#9A9A9A;font-size:10px;font-weight:400;margin-top:2px;line-height:12px;">${bi("누적", "Total")} ${total}</div></td></tr></table><!--<![endif]--></td>`;
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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
  body, table, td, p, a, li { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  /* Language toggle (browser-only; ignored by Outlook/email clients) */
  body.lang-en .lg-ko { display:none !important; }
  body.lang-en .lg-en { display:inline !important; }
  body:not(.lang-en) .lg-ko { display:inline; }
  body:not(.lang-en) .lg-en { display:none !important; }
  /* Segmented language toggle */
  .lg-seg { position:relative; display:inline-block; background:#FFFFFF; border:1px solid #ECECEE; border-radius:12px; padding:3px; height:44px; box-sizing:border-box; vertical-align:middle; }
  .lg-seg-track { position:relative; display:flex; height:100%; }
  .lg-seg-btn { position:relative; display:inline-flex; align-items:center; justify-content:center; min-width:44px; padding:0 14px; height:100%; font-family:'Inter',sans-serif; font-weight:600; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#6B6B74; background:transparent; border:0; cursor:pointer; transition:color .18s ease; outline:none; }
  .lg-seg-btn:hover { color:#0F0F12; }
  .lg-seg-btn[aria-selected="true"] { color:#0F0F12; }
  .lg-seg-underline { position:absolute; bottom:4px; left:0; height:2px; width:calc(50% - 10px); margin:0 10px; background:#EF2A3C; border-radius:2px; transform:translateX(0); transition:transform 220ms cubic-bezier(.2,.7,.2,1); pointer-events:none; }
  body.lang-en .lg-seg-underline { transform:translateX(100%); }
  /* Weekly meta pill */
  .lg-weekly { display:inline-flex; align-items:center; height:44px; padding:0 16px; background:#FFFFFF; border:1px solid #ECECEE; border-radius:12px; font-family:'Inter',sans-serif; vertical-align:middle; box-sizing:border-box; }
  .lg-weekly-dot { width:6px; height:6px; border-radius:50%; background:#EF2A3C; box-shadow:0 0 0 4px rgba(239,42,60,.15); margin-right:10px; animation:lgPulse 2s ease-in-out infinite; }
  .lg-weekly-label { font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#0F0F12; }
  .lg-weekly-divider { display:inline-block; width:1px; height:16px; background:#ECECEE; margin:0 12px; vertical-align:middle; }
  .lg-weekly-date { font-family:'IBM Plex Mono',monospace; font-weight:500; font-size:11px; color:#6B6B74; }
  @keyframes lgPulse { 0%,100% { box-shadow:0 0 0 0 rgba(239,42,60,.25); } 50% { box-shadow:0 0 0 6px rgba(239,42,60,.05); } }
  .lg-header-controls { display:inline-flex; gap:10px; align-items:center; }
  @media only screen and (max-width:699px) {
    .email-container { width:100% !important; max-width:100% !important; }
    .stack-column { display:block !important; width:100% !important; }
    .lg-header-controls { margin-top:14px; }
    .lg-weekly-date.full { display:none; }
    .lg-weekly-date.compact { display:inline !important; }
  }
  .lg-weekly-date.compact { display:none; }
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
      <div style="font-size:13px;color:#6B6A6E;margin-top:6px;mso-line-height-rule:exactly;line-height:18px;font-weight:400;">${bi("주간 인사이트 리포트", "Weekly Insight Report")} &nbsp;·&nbsp; <span style="color:#9B9A9E;">${bi("리뷰를 즉시 활용 가능한 마케팅 에셋으로", "Turn Real Reviews into Ready-to-Use Marketing Assets.")}</span></div>
    </td>
    <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
      <!-- Language Toggle + Weekly Meta (browser-only; Outlook fallback below) -->
      <!--[if !mso]><!-->
      <span class="lg-header-controls">
        <span class="lg-seg" role="tablist" aria-label="Language">
          <span class="lg-seg-track">
            <button type="button" id="lg-btn-ko" role="tab" aria-selected="true" class="lg-seg-btn"
              onclick="document.body.classList.remove('lang-en');document.getElementById('lg-btn-ko').setAttribute('aria-selected','true');document.getElementById('lg-btn-en').setAttribute('aria-selected','false');">KO</button>
            <button type="button" id="lg-btn-en" role="tab" aria-selected="false" class="lg-seg-btn"
              onclick="document.body.classList.add('lang-en');document.getElementById('lg-btn-en').setAttribute('aria-selected','true');document.getElementById('lg-btn-ko').setAttribute('aria-selected','false');">EN</button>
          </span>
          <span class="lg-seg-underline" aria-hidden="true"></span>
        </span>
        <span class="lg-weekly">
          <span class="lg-weekly-dot" aria-hidden="true"></span>
          <span class="lg-weekly-label">WEEKLY</span>
          <span class="lg-weekly-divider" aria-hidden="true"></span>
          <time class="lg-weekly-date full" datetime="${_weekAgo.toISOString().slice(0,10)}/${_now.toISOString().slice(0,10)}">${weeklyDateFull}</time>
          <time class="lg-weekly-date compact" datetime="${_weekAgo.toISOString().slice(0,10)}/${_now.toISOString().slice(0,10)}">${weeklyDateCompact}</time>
        </span>
      </span>
      <script>
        (function(){
          var ko=document.getElementById('lg-btn-ko'), en=document.getElementById('lg-btn-en');
          if(!ko||!en) return;
          function onKey(e){
            if(e.key==='ArrowRight'){en.click();en.focus();}
            else if(e.key==='ArrowLeft'){ko.click();ko.focus();}
          }
          ko.addEventListener('keydown',onKey); en.addEventListener('keydown',onKey);
        })();
      </script>
      <!--<![endif]-->
      <!--[if mso]>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right">
        <tr><td style="background:#FFFFFF;border:1px solid #ECECEE;padding:10px 16px;text-align:center;font-family:${INTER};border-radius:12px;">
          <span style="font-size:11px;font-weight:600;color:#0F0F12;letter-spacing:1.4px;">WEEKLY</span>
          <span style="display:inline-block;width:1px;height:10px;background:#ECECEE;margin:0 10px;"></span>
          <span style="font-size:11px;color:#6B6B74;">${d.dateRange}</span>
        </td></tr>
      </table>
      <![endif]-->
    </td>
  </tr></table>
</td></tr>

<!-- Intro -->
<tr><td style="padding:20px 32px;border-bottom:1px solid #F0ECE4;font-family:${FONT};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="font-size:14px;font-weight:600;color:#1B1A1E;padding-bottom:6px;mso-line-height-rule:exactly;line-height:20px;letter-spacing:-0.2px;">${bi("고객의 생생한 목소리에서 마케팅의 해답을 찾습니다.", "Find marketing answers in real customer voices.")}</td></tr>
    <tr><td style="font-size:12px;color:#6B6A6E;line-height:20px;font-weight:400;">${bi("RTA Studio는 15개국, 43개+ 채널의 실사용자 리뷰를 통합 분석하여 숨겨진 인사이트를 발견하고, 즉시 활용 가능한 마케팅 에셋을 제공하는 올인원 플랫폼입니다.", "RTA Studio analyzes real user reviews across 15 countries and 43+ channels, surfacing hidden insights and producing ready-to-use marketing assets — all in one platform.")}</td></tr>
  </table>
</td></tr>

<!-- Data Bar (LG.com beige strip) -->
<tr><td style="padding:20px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0ECE4;border-radius:24px;overflow:hidden;">
    <tr><td style="padding:14px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:12px;font-weight:600;color:#1B1A1E;font-family:${FONT};letter-spacing:-0.1px;">${bi("데이터 수집 현황", "Data Collection Status")}</td>
        <td style="text-align:right;font-size:11px;color:#6B6A6E;font-family:${FONT};white-space:nowrap;">
          <span style="color:#8B8A8E;font-weight:400;margin-right:4px;">${bi("이번주", "This week")}</span>
          <strong style="color:#EA1917;font-size:12px;font-weight:700;">${d.weeklyReviews.toLocaleString()}</strong>
          <span style="color:#8B8A8E;font-weight:400;">${bi("건", "reviews")}</span>
          <span style="color:#D5D0C5;margin:0 8px;">·</span>
          <span style="color:#8B8A8E;font-weight:400;margin-right:4px;">${bi("누적", "Total")}</span>
          <strong style="color:#1B1A1E;font-size:12px;font-weight:700;">${d.totalReviews.toLocaleString()}</strong>
          <span style="color:#8B8A8E;font-weight:400;">${bi("건", "reviews")}</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 18px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;table-layout:fixed;"><tr>${channelBadges}</tr></table>
    </td></tr>
  </table>
</td></tr>

<!-- KPI Pulse Row (LG.com style cards) -->
<tr><td style="padding:20px 32px 28px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td width="25%" style="padding:0 4px 0 0;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
        <tr><td style="height:4px;background:#EA1917;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:14px 12px;text-align:center;height:120px;vertical-align:middle;font-family:${INTER};">
          <div style="font-size:10px;font-weight:600;color:#8B8A8E;letter-spacing:0.4px;line-height:14px;">${bi("총 리뷰 수집", "Total Reviews")}</div>
          <div style="font-size:22px;font-weight:700;color:#1B1A1E;line-height:28px;margin-top:4px;letter-spacing:-0.6px;">${d.totalReviews.toLocaleString()}</div>
          <div style="font-size:10px;color:${d.wow >= 0 ? '#0D9488' : '#EA1917'};font-weight:600;margin-top:3px;">${d.wow > 0 ? '▲ +' : d.wow < 0 ? '▼ ' : ''}${d.wow}% ${bi("vs 전주", "vs last week")}</div>
        </td></tr>
      </table>
    </td>
    <td width="25%" style="padding:0 4px;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
        <tr><td style="height:4px;background:#0D9488;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:14px 12px;text-align:center;height:120px;vertical-align:middle;font-family:${INTER};">
          <div style="font-size:10px;font-weight:600;color:#8B8A8E;letter-spacing:0.4px;line-height:14px;">${bi("긍정 TOP 키워드", "Top Positive Keyword")}</div>
          <div style="font-size:14px;font-weight:700;color:#0D9488;line-height:20px;margin-top:6px;letter-spacing:-0.2px;">"${d.topPositiveKeyword}"</div>
          <div style="font-size:10px;color:#8B8A8E;margin-top:3px;font-weight:400;">${d.topPositiveCount} ${bi("건 언급 1위", "mentions · #1")}</div>
        </td></tr>
      </table>
    </td>
    <td width="25%" style="padding:0 4px;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
        <tr><td style="height:4px;background:#EA1917;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:14px 12px;text-align:center;height:120px;vertical-align:middle;font-family:${INTER};">
          <div style="font-size:10px;font-weight:600;color:#8B8A8E;letter-spacing:0.4px;line-height:14px;">${bi("부정 TOP 키워드", "Top Negative Keyword")}</div>
          <div style="font-size:14px;font-weight:700;color:#EA1917;line-height:20px;margin-top:6px;letter-spacing:-0.2px;">"${d.topNegativeKeyword}"</div>
          <div style="font-size:10px;color:#8B8A8E;margin-top:3px;font-weight:400;">${d.topNegativeCount} ${bi("건 · FAQ 대응", "mentions · FAQ needed")}</div>
        </td></tr>
      </table>
    </td>
    <td width="25%" style="padding:0 0 0 4px;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
        <tr><td style="height:4px;background:#1B1A1E;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:14px 12px;text-align:center;height:120px;vertical-align:middle;font-family:${INTER};">
          <div style="font-size:10px;font-weight:600;color:#8B8A8E;letter-spacing:0.4px;line-height:14px;">${bi("주간 언급 TOP", "Top Mentioned Product")}</div>
          <div style="font-size:13px;font-weight:700;color:#1B1A1E;line-height:18px;margin-top:6px;letter-spacing:-0.2px;">${d.topProduct}</div>
          <div style="font-size:10px;color:#8B8A8E;margin-top:3px;font-weight:400;">${d.topProductCount} ${bi("건 · 1위", "mentions · #1")}</div>
        </td></tr>
      </table>
    </td>
  </tr></table>
</td></tr>

${d.opportunities.length > 0 ? `<!-- Marketing Opportunity Matrix -->
<tr><td style="padding:8px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F0;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
    <tr><td style="padding:14px 18px;border-bottom:1px solid #E5DFD3;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:13px;font-weight:700;color:#1B1A1E;font-family:${INTER};letter-spacing:-0.2px;">🎯 마케팅 기회 매트릭스</td>
        <td style="text-align:right;font-size:10px;color:#8B8A8E;font-family:${FONT};font-weight:400;">리뷰 기반 자동 분류</td>
      </tr></table>
    </td></tr>
    ${d.opportunities.map(op => {
      const tc = op.tag === "amplify" ? "#0D9488" : op.tag === "fix" ? "#EA1917" : "#D97706";
      const tb = op.tag === "amplify" ? "#F0FDFA" : op.tag === "fix" ? "#FEF2F2" : "#FFFBEB";
      const tl = op.tag === "amplify" ? "AMPLIFY" : op.tag === "fix" ? "FIX" : "WATCH";
      const dc = op.delta.includes("+") || op.delta.startsWith("▲") ? "#0D9488"
               : op.delta.includes("-") || op.delta.startsWith("▼") ? "#EA1917" : "#4A4A4A";
      return `<tr><td style="padding:0;background:#FFFFFF;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-bottom:1px solid #F0ECE4;"><tr>
          <td width="4" style="background:${tc};font-size:0;">&nbsp;</td>
          <td style="padding:12px 16px;font-family:${FONT};">
            <div style="margin-bottom:5px;">
              <span style="font-size:9px;font-weight:700;padding:3px 8px;background:${tb};color:${tc};border-radius:50px;letter-spacing:0.3px;">${tl}</span>
              <span style="font-size:9px;font-weight:600;padding:3px 8px;margin-left:4px;background:#F0ECE4;color:#1B1A1E;border-radius:50px;">${op.country}</span>
              <span style="font-size:9px;font-weight:600;padding:3px 8px;margin-left:3px;background:#F5F2EC;color:#4A4A4A;border-radius:50px;">${op.channel}</span>
            </div>
            <div style="font-size:12px;font-weight:700;color:#1B1A1E;line-height:17px;letter-spacing:-0.1px;">${op.title}</div>
            <div style="font-size:10.5px;color:#4A4A4A;line-height:15px;margin-top:3px;font-weight:400;">${op.desc}</div>
          </td>
          <td width="76" style="padding:12px 16px 12px 8px;text-align:right;font-family:${INTER};vertical-align:middle;">
            <div style="font-size:18px;font-weight:700;color:${dc};letter-spacing:-0.4px;">${op.count}</div>
            <div style="font-size:9px;color:#8B8A8E;font-weight:400;">건</div>
            <div style="font-size:10px;font-weight:600;color:${dc};margin-top:2px;">${op.delta}</div>
          </td>
        </tr></table>
      </td></tr>`;
    }).join("")}
  </table>
</td></tr>` : ""}

${d.trendingSignals.length > 0 ? `<!-- Trending Signals -->
<tr><td style="padding:20px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F0;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
    <tr><td style="padding:14px 18px;border-bottom:1px solid #E5DFD3;">
      <div style="font-size:13px;font-weight:700;color:#1B1A1E;font-family:${INTER};letter-spacing:-0.2px;">🔥 트렌딩 신호 — 이번 주 주목 키워드</div>
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
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" height="120" style="border:1px solid ${bc};background:${bg};height:120px;border-radius:16px;">
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
    <tr><td style="font-size:14px;font-weight:800;color:#EA1917;padding-bottom:16px;font-family:${INTER};">💡 ${bi("KEY TAKEAWAY — 채널별 마케터 인사이트", "KEY TAKEAWAY — Marketer Insights by Channel")}</td></tr>
  </table>

  ${renderKeyTakeaway("LG.COM", "🏪", "#A50034", lgcom)}
  ${renderKeyTakeaway(bi("커뮤니티 통합 Overview", "Communities Combined Overview"), "💬", "#FF4500", reddit)}

  ${allChannel ? `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:4px;">
    <tr><td style="padding-left:10px;border-left:4px solid #0D9488;font-size:12px;font-weight:700;color:#1B1A1E;padding-bottom:10px;font-family:${INTER};letter-spacing:-0.1px;">🌐 전채널 종합</td></tr>
    <tr><td>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E5DFD3;background:#FAF7F0;border-radius:20px;overflow:hidden;">
        <tr><td style="padding:16px 18px;font-size:12px;color:#1B1A1E;line-height:20px;font-family:${FONT};font-weight:400;">${allChannel.key_takeaway}</td></tr>
      </table>
    </td></tr>
  </table>` : ""}
</td></tr>

${d.regionalSignals.length > 0 ? `<!-- Regional Marketing Signals (per-country snapshot for local marketers) -->
<tr><td style="padding:24px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F0;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
    <tr><td style="padding:14px 18px;border-bottom:1px solid #E5DFD3;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:13px;font-weight:700;color:#1B1A1E;font-family:${INTER};letter-spacing:-0.2px;">🌍 지역별 마케팅 시그널</td>
        <td style="text-align:right;font-size:10px;color:#8B8A8E;font-family:${FONT};font-weight:400;">현지 마케터 액션 가이드</td>
      </tr></table>
    </td></tr>
    ${d.regionalSignals.slice(0, 6).map((rs, idx, arr) => {
      const sentColor = rs.posPct >= 70 ? "#0D9488" : rs.negPct >= 30 ? "#EA1917" : "#D97706";
      const sentLabel = rs.posPct >= 70 ? "긍정 우세" : rs.negPct >= 30 ? "부정 주의" : "혼조";
      const sentBg = sentColor === "#0D9488" ? "#F0FDFA" : sentColor === "#EA1917" ? "#FEF2F2" : "#FFFBEB";
      return `<tr><td style="padding:0;background:#FFFFFF;${idx < arr.length - 1 ? "border-bottom:1px solid #F0ECE4;" : ""}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="80" style="padding:14px 12px 14px 18px;vertical-align:middle;font-family:${INTER};">
            <div style="font-size:18px;line-height:22px;">${rs.flag}</div>
            <div style="font-size:11px;font-weight:700;color:#1B1A1E;margin-top:2px;letter-spacing:-0.1px;">${rs.country}</div>
          </td>
          <td style="padding:14px 8px;font-family:${FONT};vertical-align:middle;">
            <div style="margin-bottom:4px;">
              <span style="display:inline-block;background:${sentBg};color:${sentColor};padding:2px 9px;font-size:9px;font-weight:700;border-radius:50px;letter-spacing:0.3px;margin-right:5px;">${sentLabel}</span>
              <span style="display:inline-block;background:#F0ECE4;color:#1B1A1E;padding:2px 9px;font-size:9px;font-weight:600;border-radius:50px;">${rs.topCategory}</span>
            </div>
            <div style="font-size:11.5px;color:#1B1A1E;line-height:16px;font-weight:500;letter-spacing:-0.1px;">${rs.signal}</div>
          </td>
          <td width="86" style="padding:14px 18px 14px 8px;text-align:right;vertical-align:middle;font-family:${INTER};">
            <div style="font-size:16px;font-weight:700;color:#1B1A1E;letter-spacing:-0.4px;">${rs.total.toLocaleString()}</div>
            <div style="font-size:9px;color:#8B8A8E;font-weight:400;">건 수집</div>
            <div style="font-size:10px;font-weight:600;color:${sentColor};margin-top:2px;">긍 ${rs.posPct}% · 부 ${rs.negPct}%</div>
          </td>
        </tr></table>
      </td></tr>`;
    }).join("")}
  </table>
</td></tr>` : ""}

${d.actionChecklist.length > 0 ? `<!-- Weekly Action Checklist -->
<tr><td style="padding:24px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F0;border:1px solid #E5DFD3;border-radius:24px;overflow:hidden;">
    <tr><td style="padding:14px 18px;border-bottom:1px solid #E5DFD3;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:13px;font-weight:700;color:#1B1A1E;font-family:${INTER};letter-spacing:-0.2px;">📋 이번 주 추천 액션 체크리스트</td>
        <td style="text-align:right;font-size:10px;color:#8B8A8E;font-family:${FONT};font-weight:400;">즉시 실행 가능</td>
      </tr></table>
    </td></tr>
    ${d.actionChecklist.slice(0, 6).map((ac, idx, arr) => {
      const pColor = ac.priority === "HIGH" ? "#EA1917" : ac.priority === "MID" ? "#D97706" : "#0D9488";
      const pBg = ac.priority === "HIGH" ? "#FEF2F2" : ac.priority === "MID" ? "#FFFBEB" : "#F0FDFA";
      return `<tr><td style="padding:0;background:#FFFFFF;${idx < arr.length - 1 ? "border-bottom:1px solid #F0ECE4;" : ""}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="6" style="background:${pColor};font-size:0;line-height:0;">&nbsp;</td>
          <td style="padding:13px 16px 13px 14px;font-family:${FONT};">
            <div style="margin-bottom:6px;">
              <span style="display:inline-block;background:${pBg};color:${pColor};padding:2px 10px;font-size:9px;font-weight:700;border-radius:50px;letter-spacing:0.3px;margin-right:5px;">${ac.priority}</span>
              <span style="display:inline-block;background:#1B1A1E;color:#FFFFFF;padding:2px 10px;font-size:9px;font-weight:600;border-radius:50px;margin-right:5px;">${ac.channel}</span>
              <span style="display:inline-block;background:#F0ECE4;color:#1B1A1E;padding:2px 9px;font-size:9px;font-weight:500;border-radius:50px;">${ac.owner}</span>
            </div>
            <div style="font-size:12px;font-weight:700;color:#1B1A1E;line-height:17px;letter-spacing:-0.1px;">${ac.action}</div>
            <div style="font-size:10.5px;color:#6B6A6E;line-height:15px;margin-top:3px;font-weight:400;">근거 — ${ac.basis}</div>
          </td>
        </tr></table>
      </td></tr>`;
    }).join("")}
  </table>
</td></tr>` : ""}

<!-- Divider -->
<tr><td style="padding:16px 32px 0;font-size:0;line-height:0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:2px solid #E8E4DC;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>

<!-- LG.com Section -->
${channelSectionHTML(bi("LG.COM 주간 Overview", "LG.COM Weekly Overview"), "🏪", lgcom)}

<!-- Divider -->
<tr><td style="padding:16px 32px 0;font-size:0;line-height:0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:2px solid #E8E4DC;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>

<!-- Reddit + Community 통합 Section -->
${channelSectionHTML(bi("커뮤니티 통합 주간 Overview (Reddit · Amazon · YouTube · Trustpilot · etc)", "Communities — Combined Weekly Overview (Reddit · Amazon · YouTube · Trustpilot · etc)"), "💬", reddit)}

<!-- CTA Banner -->
<tr><td style="padding:28px 32px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#1B1A1E;border-radius:24px;overflow:hidden;">
    <tr><td colspan="3" style="height:4px;background:#EA1917;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr>
    <tr>
      <td width="180" style="padding:24px 18px;vertical-align:middle;">
        <table role="presentation" cellpadding="0" cellspacing="4" border="0"><tr>
          <td width="54" height="48" style="background:#2A292E;border:1px solid #3A393E;text-align:center;vertical-align:middle;font-family:${FONT};border-radius:12px;"><div style="font-size:16px;">📊</div><div style="font-size:7px;color:#B5B4B8;">리뷰 분석</div></td>
          <td width="54" height="48" style="background:#2A292E;border:1px solid #3A393E;text-align:center;vertical-align:middle;font-family:${FONT};border-radius:12px;"><div style="font-size:16px;">⚡</div><div style="font-size:7px;color:#B5B4B8;">광고 카피</div></td>
          <td width="54" height="48" style="background:#2A292E;border:1px solid #3A393E;text-align:center;vertical-align:middle;font-family:${FONT};border-radius:12px;"><div style="font-size:16px;">❓</div><div style="font-size:7px;color:#B5B4B8;">FAQ</div></td>
        </tr></table>
      </td>
      <td width="1" style="padding:14px 0;vertical-align:middle;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:1px;height:80px;background:#3A393E;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
      <td style="padding:24px 24px;vertical-align:middle;font-family:${FONT};">
        <div style="font-family:${INTER};font-size:13px;font-weight:600;color:#B5B4B8;mso-line-height-rule:exactly;line-height:18px;letter-spacing:0.3px;">Marketing Asset Studio</div>
        <div style="font-family:${INTER};font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;mso-line-height-rule:exactly;line-height:28px;margin-top:4px;">Review-to-Asset,<br/><span style="color:#EA1917;">Instantly.</span></div>
        <div style="font-size:11px;color:#B5B4B8;line-height:18px;margin-top:8px;font-weight:400;">광고 카피부터 이미지 에셋까지 —<br/>리뷰가 증명한 메시지로 만듭니다.</div>
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr><td style="background:#FFFFFF;padding:10px 22px;"><a href="${baseUrl}/" style="color:#1B1A1E;font-family:${INTER};font-size:11px;font-weight:600;text-decoration:none;">마케팅 에셋 스튜디오 바로가기 →</a></td></tr></table><![endif]-->
        <!--[if !mso]><!--><a href="${baseUrl}/" style="display:inline-block;margin-top:14px;background:#FFFFFF;color:#1B1A1E;border-radius:50px;padding:10px 22px;font-family:${INTER};font-size:11px;font-weight:600;text-decoration:none;">마케팅 에셋 스튜디오 바로가기 →</a><!--<![endif]-->
      </td>
    </tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 32px 28px;border-top:1px solid #F0ECE4;background:#FAF9F6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td style="font-family:${INTER};"><div style="font-size:11px;font-weight:700;color:#1B1A1E;mso-line-height-rule:exactly;line-height:16px;letter-spacing:-0.1px;">Review-to-Asset Studio</div><div style="font-size:9px;color:#8B8A8E;margin-top:3px;mso-line-height-rule:exactly;line-height:14px;font-weight:400;">AI-Generated Weekly Insights · Provided by LG전자 D2C마케팅전략팀</div></td>
    <td style="text-align:right;font-family:${FONT};"><div style="font-size:9px;color:#B5B4B8;line-height:14px;font-weight:400;">본 뉴스레터는 사내 배포용으로<br/>외부 공유를 금합니다.</div></td>
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
      sb.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", weekAgo.toISOString()),
      sb.from("reviews").select("*", { count: "exact", head: true }).gte("collected_at", twoWeeksAgo.toISOString()).lt("collected_at", weekAgo.toISOString()),
      sb.from("reviews").select("*", { count: "exact", head: true }),
      sb.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
      kwQuery,
      sb.from("trending_snapshots").select("product_id, mention_count, change_percent, trend, products!inner(display_name, model_number, is_active)").eq("products.is_active", true).order("mention_count", { ascending: false }).limit(10),
    ]);

    const wow = (lastWeekRes.count || 0) > 0
      ? Math.round((((weeklyRes.count || 0) - (lastWeekRes.count || 0)) / (lastWeekRes.count || 1)) * 100)
      : 0;

    const { data: sourceCounts } = await sb.rpc("get_source_counts");
    const { data: weeklySourceCounts } = await sb.rpc("get_recent_source_counts", { p_hours: 168 });
    const weeklyMap: Record<string, number> = {};
    for (const w of (weeklySourceCounts || []) as any[]) {
      let key = w.source as string;
      if (key?.startsWith("reddit")) key = "reddit";
      else if (key?.startsWith("youtube")) key = "youtube";
      else if (key?.startsWith("lge_com")) key = "lge_com";
      else if (key?.startsWith("shopee")) key = "shopee";
      else if (key?.startsWith("lazada")) key = "lazada";
      else if (key?.startsWith("amazon")) key = "amazon";
      else if (key?.startsWith("web_review")) key = "web_review";
      weeklyMap[key] = (weeklyMap[key] ?? 0) + Number(w.count ?? 0);
    }
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
      return { name: cfg.label, count: s.count, weeklyCount: weeklyMap[s.source] ?? 0, color: cfg.color };
    });
    const otherCount = sortedSources.slice(4).reduce((sum: number, s: any) => sum + s.count, 0);
    const otherWeekly = sortedSources.slice(4).reduce((sum: number, s: any) => sum + (weeklyMap[s.source] ?? 0), 0);
    if (otherCount > 0) {
      topChannels.push({ name: `+${sortedSources.length - 4}개 채널`, count: otherCount, weeklyCount: otherWeekly, color: "#999" });
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
    // LGE 법인 코드 (RIS Subsidiary List 표준)
    const SOURCE_TO_FLAG: Record<string, string> = {
      lge_com_us: "🇺🇸 LGEUS", lge_com_uk: "🇬🇧 LGEUK", lge_com_de: "🇩🇪 LGEDE",
      lge_com_au: "🇦🇺 LGEAP", lge_com_in: "🇮🇳 LGEIL", lge_com_tw: "🇹🇼 LGETT",
      lge_com_jp: "🇯🇵 LGEJP", lge_com_th: "🇹🇭 LGETH", lge_com_br: "🇧🇷 LGESP",
      lge_com_ca: "🇨🇦 LGECI", lge_com_mx: "🇲🇽 LGEMS", lge_com_fr: "🇫🇷 LGEFS",
      lge_com_nl: "🇳🇱 LGEBN", lge_com_sg: "🇸🇬 LGESL", lge_com_my: "🇲🇾 LGEML",
      lge_com_id: "🇮🇩 LGEIN", lge_com_ph: "🇵🇭 LGEPH", lge_com_vn: "🇻🇳 LGEVN",
      lge_com_hk: "🇭🇰 LGEHK",
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

    // ── Regional Marketing Signals — country-level snapshot for local marketers ──
    // 법인 코드(name)는 RIS Subsidiary List 기준
    const COUNTRY_META: Record<string, { name: string; flag: string }> = {
      lge_com_us: { name: "LGEUS", flag: "🇺🇸" }, lge_com_uk: { name: "LGEUK", flag: "🇬🇧" },
      lge_com_de: { name: "LGEDE", flag: "🇩🇪" }, lge_com_au: { name: "LGEAP", flag: "🇦🇺" },
      lge_com_in: { name: "LGEIL", flag: "🇮🇳" }, lge_com_tw: { name: "LGETT", flag: "🇹🇼" },
      lge_com_jp: { name: "LGEJP", flag: "🇯🇵" }, lge_com_th: { name: "LGETH", flag: "🇹🇭" },
      lge_com_br: { name: "LGESP", flag: "🇧🇷" }, lge_com_ca: { name: "LGECI", flag: "🇨🇦" },
      lge_com_mx: { name: "LGEMS", flag: "🇲🇽" }, lge_com_fr: { name: "LGEFS", flag: "🇫🇷" },
      lge_com_nl: { name: "LGEBN", flag: "🇳🇱" }, lge_com_sg: { name: "LGESL", flag: "🇸🇬" },
      lge_com_my: { name: "LGEML", flag: "🇲🇾" }, lge_com_id: { name: "LGEIN", flag: "🇮🇩" },
      lge_com_ph: { name: "LGEPH", flag: "🇵🇭" }, lge_com_vn: { name: "LGEVN", flag: "🇻🇳" },
      lge_com_hk: { name: "LGEHK", flag: "🇭🇰" },
    };
    const countryAgg: Record<string, { total: number; pos: number; neg: number; cats: Record<string, number> }> = {};
    for (const r of (weeklyAgg ?? []) as any[]) {
      if (!r.source?.startsWith("lge_com_")) continue;
      const meta = COUNTRY_META[r.source];
      if (!meta) continue;
      const key = meta.name;
      if (!countryAgg[key]) countryAgg[key] = { total: 0, pos: 0, neg: 0, cats: {} };
      const c = countryAgg[key];
      c.total += 1;
      if (r.sentiment === "positive") c.pos += 1;
      else if (r.sentiment === "negative") c.neg += 1;
      const cat = r.products?.category || "General";
      c.cats[cat] = (c.cats[cat] ?? 0) + 1;
    }
    const regionalSignals = Object.entries(countryAgg)
      .map(([country, s]) => {
        const flag = Object.values(COUNTRY_META).find(m => m.name === country)?.flag || "🌐";
        const posPct = s.total > 0 ? Math.round((s.pos / s.total) * 100) : 0;
        const negPct = s.total > 0 ? Math.round((s.neg / s.total) * 100) : 0;
        const topCategory = Object.entries(s.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
        let signal = `${topCategory} 카테고리 ${s.total}건 수집 — 추가 모니터링`;
        if (posPct >= 75) signal = `${topCategory} 긍정 시그널 강함 — Affiliate/PMAX 소재 확대 권고`;
        else if (negPct >= 35) signal = `${topCategory} 부정 누적 — 현지 FAQ/PDP 보강 우선`;
        else if (posPct >= 55) signal = `${topCategory} 호의적 흐름 — Criteo 리타겟팅 강화 검토`;
        return { country, flag, total: s.total, posPct, negPct, topCategory, signal };
      })
      .filter(r => r.total >= 5)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // ── Action Checklist — derived from opportunities + trending + regional ──
    const actionChecklist: { priority: "HIGH" | "MID" | "LOW"; channel: string; action: string; basis: string; owner: string }[] = [];
    for (const op of opportunities.slice(0, 4)) {
      const countryTag = op.country && op.country !== "-" ? op.country : "GLOBAL";
      if (op.tag === "fix") {
        actionChecklist.push({
          priority: "HIGH",
          channel: "FAQ / PDP",
          action: `${op.title} — FAQ 보강 및 CRITEO 캠페인 일시 중단`,
          basis: `${op.country} ${op.channel} · ${op.desc}`,
          owner: countryTag,
        });
      } else if (op.tag === "amplify") {
        actionChecklist.push({
          priority: "MID",
          channel: "PMAX / Affiliate",
          action: `${op.title} — 긍정 리뷰 헤드라인을 PMAX 소재로 즉시 적용`,
          basis: `${op.country} ${op.channel} · ${op.desc}`,
          owner: countryTag,
        });
      } else {
        actionChecklist.push({
          priority: "LOW",
          channel: "모니터링",
          action: `${op.title} — 차주 데이터 누적 후 재평가`,
          basis: `${op.country} ${op.channel} · ${op.desc}`,
          owner: countryTag,
        });
      }
    }
    if (negKws[0]?.keyword) {
      // 부정 키워드 상위 국가 추정
      const topNegCountry = regionalSignals
        .filter(r => r.negPct >= 30)
        .sort((a, b) => b.negPct - a.negPct)[0]?.country ?? "GLOBAL";
      actionChecklist.push({
        priority: "HIGH",
        channel: "CRM / CS",
        action: `"${negKws[0].keyword}" 부정 키워드 대응 — CS 응대 스크립트 업데이트`,
        basis: `이번 주 부정 1위 · ${negKws[0].count}건 언급`,
        owner: topNegCountry,
      });
    }
    if (posKws[0]?.keyword) {
      const topPosCountry = regionalSignals
        .sort((a, b) => b.posPct - a.posPct)[0]?.country ?? "GLOBAL";
      actionChecklist.push({
        priority: "MID",
        channel: "SEO / 콘텐츠",
        action: `"${posKws[0].keyword}" 키워드 — 블로그·PDP 본문에 반영하여 SEO 강화`,
        basis: `이번 주 긍정 1위 · ${posKws[0].count}건 언급`,
        owner: topPosCountry,
      });
    }

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
      regionalSignals,
      actionChecklist: actionChecklist.slice(0, 6),
    };

    // ── Generate AI insights ──
    console.log("Generating AI channel insights...");
    let [lgcomInsight, redditInsight, communityInsight, allChannelSummary] = await Promise.all([
      generateChannelInsight(sb, lovableApiKey, "lgcom"),
      generateChannelInsight(sb, lovableApiKey, "reddit"),
      generateChannelInsight(sb, lovableApiKey, "community"),
      generateAllChannelSummary(sb, lovableApiKey),
    ]);
    // Deterministic fallback so sections never go blank when AI fails
    if (!lgcomInsight) lgcomInsight = await buildFallbackInsight(sb, "lgcom");
    if (!redditInsight) redditInsight = await buildFallbackInsight(sb, "reddit");
    if (!communityInsight) communityInsight = await buildFallbackInsight(sb, "community");
    // Merge Reddit + Community into a single combined overview
    let combinedRedditCommunity = mergeChannelInsights(redditInsight, communityInsight);
    if (!combinedRedditCommunity) combinedRedditCommunity = await buildFallbackInsight(sb, "reddit_plus_community");
    console.log("AI insights generated:", { lgcom: !!lgcomInsight, reddit: !!redditInsight, community: !!communityInsight, combined: !!combinedRedditCommunity, allChannel: !!allChannelSummary });

    const html = buildNewsletterHTML(newsletterData, lgcomInsight, combinedRedditCommunity, baseUrl, allChannelSummary, null);

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
