import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  channel: z.enum(["lgcom", "reddit", "other"]).default("lgcom"),
});

type ReviewRow = {
  id: string;
  title: string | null;
  content: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  rating: number | null;
  source: string | null;
  collected_at: string | null;
  product_id: string | null;
};

const REVIEW_SELECT =
  "id,title,content,sentiment,sentiment_score,rating,source,collected_at,product_id";

const MIN_REQUIRED_REVIEWS = 30;
const TARGET_SAMPLE_SIZE = 180;
const REVIEW_PAGE_SIZE = 200;

const REVIEW_WINDOWS = [
  { label: "이번 주 수집 리뷰", days: 7, maxScanRows: 800 },
  { label: "최근 30일 수집 리뷰", days: 30, maxScanRows: 1200 },
  { label: "전체 누적 (수집일 기준)", days: null, maxScanRows: 1600 },
] as const;

function matchesChannel(source: string | null | undefined, channel: string) {
  const normalized = String(source ?? "");
  if (channel === "lgcom") return normalized.startsWith("lge_com");
  if (channel === "reddit") return normalized.startsWith("reddit");
  return !normalized.startsWith("lge_com") && !normalized.startsWith("reddit");
}

function getSinceIso(days: number | null) {
  if (days === null) return null;
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since.toISOString();
}

function sanitizeFetchError(message: string) {
  if (message.includes("<!DOCTYPE html>")) {
    return "review query timed out upstream";
  }
  return message;
}

async function fetchReviewPage(
  sb: any,
  sinceIso: string | null,
  offset: number,
  limit: number,
) {
  let query = sb
    .from("reviews")
    .select(REVIEW_SELECT)
    .order("collected_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (sinceIso) {
    query = query.gte("collected_at", sinceIso);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(
      `Failed to fetch reviews: ${sanitizeFetchError(error.message)}`,
    );
  }

  return (data ?? []) as ReviewRow[];
}

async function fetchWindowSample(
  sb: any,
  channel: string,
  window: (typeof REVIEW_WINDOWS)[number],
) {
  const reviews: ReviewRow[] = [];
  const sinceIso = getSinceIso(window.days);

  for (
    let offset = 0;
    offset < window.maxScanRows && reviews.length < TARGET_SAMPLE_SIZE;
    offset += REVIEW_PAGE_SIZE
  ) {
    const page = await fetchReviewPage(sb, sinceIso, offset, REVIEW_PAGE_SIZE);
    const matched = page.filter((row) => matchesChannel(row.source, channel));

    if (matched.length > 0) {
      reviews.push(
        ...matched.slice(0, TARGET_SAMPLE_SIZE - reviews.length),
      );
    }

    console.log(
      `[generate-overview-summary] ${channel} ${window.label}: pageOffset=${offset}, fetched=${page.length}, matched=${matched.length}, accumulated=${reviews.length}`,
    );

    if (page.length < REVIEW_PAGE_SIZE) {
      break;
    }
  }

  return reviews;
}

async function fetchSampledReviews(sb: any, channel: string) {
  for (const window of REVIEW_WINDOWS) {
    const filtered = await fetchWindowSample(sb, channel, window);

    if (filtered.length >= MIN_REQUIRED_REVIEWS || window.days === null) {
      return {
        periodLabel: window.label,
        reviews: filtered,
      };
    }
  }

  return { periodLabel: "전체 누적 (수집일 기준)", reviews: [] as ReviewRow[] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { channel } = parsed.data;

    const { reviews, periodLabel } = await fetchSampledReviews(sb, channel);

    if (reviews.length === 0) {
      return new Response(
        JSON.stringify({ overview: null, message: "No reviews found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2) Batch-fetch product info for unique product_ids ──
    const productIds = [
      ...new Set(reviews.map((r: any) => r.product_id).filter(Boolean)),
    ];
    const productMap: Record<string, any> = {};

    // Fetch in chunks of 50 to avoid URL length issues
    for (let i = 0; i < productIds.length; i += 50) {
      const chunk = productIds.slice(i, i + 50);
      const { data: prods } = await sb.from("products")
        .select("id, display_name, model_number, category, sub_category")
        .in("id", chunk);
      if (prods) {
        for (const p of prods) productMap[p.id] = p;
      }
    }

    // ── 3) Analyze ──
    const posReviews = reviews.filter((r: any) => r.sentiment === "positive");
    const negReviews = reviews.filter((r: any) => r.sentiment === "negative");

    const aggMap: Record<string, {
      name: string;
      model: string;
      category: string;
      subCategory: string;
      pos: number;
      neg: number;
      titles: string[];
      snippets: string[];
    }> = {};

    for (const r of reviews as any[]) {
      const prod = productMap[r.product_id];
      const pName = prod?.display_name || "Unknown";
      if (!aggMap[pName]) {
        aggMap[pName] = {
          name: pName,
          model: prod?.model_number || "",
          category: prod?.category || "",
          subCategory: prod?.sub_category || "",
          pos: 0,
          neg: 0,
          titles: [],
          snippets: [],
        };
      }
      if (r.sentiment === "positive") aggMap[pName].pos++;
      if (r.sentiment === "negative") aggMap[pName].neg++;
      if (r.title && aggMap[pName].titles.length < 10) {
        aggMap[pName].titles.push(r.title);
      }
      if (r.content && aggMap[pName].snippets.length < 5) {
        aggMap[pName].snippets.push(r.content.slice(0, 150));
      }
    }

    const topProducts = Object.values(aggMap)
      .sort((a, b) => (b.pos + b.neg) - (a.pos + a.neg))
      .slice(0, 15);

    const productSummary = topProducts.map((p) =>
      `${p.name} (${p.model}, ${p.category}${
        p.subCategory ? ` > ${p.subCategory}` : ""
      }): 긍정 ${p.pos}건, 부정 ${p.neg}건\n  키워드: ${
        p.titles.slice(0, 5).join(", ")
      }\n  대표 리뷰: ${p.snippets.slice(0, 2).join(" | ")}`
    ).join("\n\n");

    const posSnippets = posReviews.slice(0, 30).map((r: any) => {
      const prod = productMap[r.product_id];
      return `[${prod?.display_name || "?"}] ${r.title || ""}: ${
        (r.content || "").slice(0, 120)
      }`;
    }).filter(Boolean).join("\n");

    const negSnippets = negReviews.slice(0, 30).map((r: any) => {
      const prod = productMap[r.product_id];
      return `[${prod?.display_name || "?"}] ${r.title || ""}: ${
        (r.content || "").slice(0, 120)
      }`;
    }).filter(Boolean).join("\n");

    const channelLabel = channel === "lgcom"
      ? "LG.com 공식 리뷰"
      : channel === "reddit"
      ? "Reddit 커뮤니티"
      : "기타 채널 (Amazon, YouTube, Best Buy, Shopee 등)";

    // ── 4) AI request ──
    const systemPrompt =
      `You are an expert consumer insight analyst for LG Electronics. Analyze ${channelLabel} data and provide structured weekly overview in Korean. Be specific with product names and real patterns from the data. Write in a format suitable for marketing team weekly briefing. All analysis must be grounded in the actual review data provided — do not invent or hallucinate information.`;

    const userPrompt =
      `다음은 ${channelLabel}의 ${periodLabel} 수집된 리뷰 데이터입니다:

총 리뷰: ${reviews.length}건 (긍정 ${posReviews.length}건, 부정 ${negReviews.length}건)
분석 기간: ${periodLabel}

제품별 현황:
${productSummary}

긍정 리뷰 샘플 (${posReviews.length}건 중 상위 30건):
${posSnippets.slice(0, 2000)}

부정 리뷰 샘플 (${negReviews.length}건 중 상위 30건):
${negSnippets.slice(0, 2000)}

위 실제 데이터를 기반으로 아래 5가지 섹션을 분석해주세요. 반드시 위 데이터에 존재하는 제품명과 리뷰 내용만 활용하세요.

⚠️ 주제/이슈 분류 시 제품 카테고리와 무관한 토픽은 절대 포함하지 마세요:
- TV/모니터/사운드바 제품: "Cooling/Temperature", "Wash/Clean Quality" 등 가전 토픽 제외
- 냉장고/세탁기/건조기/식기세척기/에어컨: "Picture Quality", "Gaming" 등 디스플레이 토픽 제외
- 리뷰에 "cold"/"temperature" 같은 단어가 있어도 TV라면 해당 맥락(OS 느려짐 등)에 맞는 토픽으로 분류하세요.

## 1. 고객이 가장 많이 말하는 5가지 주제 (TOP 5 Topics)
각 주제별로:
- 주제명 (구체적, 예: "OLED TV의 뛰어난 화질 및 성능")
- 전체 언급 비율 (%)
- 긍정 비율 (%) / 부정 비율 (%)
- 대표 코멘트 (리뷰 데이터에서 추출한 1줄 요약, 큰따옴표로)
- 관련 제품 모델명 리스트

## 2. 개선 시급 이슈 TOP 3 (Urgent Issues)
각 이슈별로:
- 이슈명 (구체적)
- 언급 비율 (%)
- 패턴: 어떤 상황에서 발생하는지
- 원인: 추정되는 원인
- 관련 제품 모델명 리스트

## 3. 반복 칭찬 포인트 (Recurring Praise Points)
- 5개 항목, 각각 제품명과 카테고리를 포함한 객체 형태

## 4. "비교 없이" 칭찬하는 포인트 (Unmatched Praise)
- 고객이 경쟁사 대비가 아닌 절대적으로 칭찬하는 포인트 4~5개

## 5. Key Takeaway (마케터용 핵심 인사이트)
- key_takeaway: 객체 배열 (3개)

JSON 형태로 응답:
{
  "top_topics": [
    {
      "rank": 1, "topic": "주제명", "mention_pct": 40,
      "positive_pct": 95, "negative_pct": 5,
      "representative_comment": "대표 코멘트",
      "related_products": ["모델명1", "모델명2"]
    }
  ],
  "urgent_issues": [
    {
      "rank": 1, "issue": "이슈명", "mention_pct": 70,
      "pattern": "패턴 설명", "cause": "원인 설명",
      "related_products": ["모델명1"]
    }
  ],
  "recurring_praise": [{"text": "칭찬 포인트1", "product": "제품명", "category": "TV"}],
  "unmatched_praise": ["코멘트1", "코멘트2"],
  "key_takeaway": [
    {"product": "제품명", "category": "TV", "positive_msg": "긍정 핵심", "negative_msg": "부정 핵심", "marketer_action": "액션 제안"}
  ]
}`;

    const aiRequestBody = JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    let aiResponse: Response | null = null;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        aiResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: aiRequestBody,
          },
        );
        if (aiResponse.ok) break;
        const errText = await aiResponse.text();
        console.error(
          `AI attempt ${attempt}/${maxRetries} failed: ${aiResponse.status} - ${
            errText.slice(0, 200)
          }`,
        );
        if (
          aiResponse.status >= 502 && aiResponse.status <= 504 &&
          attempt < maxRetries
        ) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        return new Response(
          JSON.stringify({
            overview: null,
            error: `AI service error: ${aiResponse.status}`,
            fallback: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (fetchErr) {
        console.error(
          `AI attempt ${attempt}/${maxRetries} network error:`,
          fetchErr,
        );
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        return new Response(
          JSON.stringify({
            overview: null,
            error: "AI service unreachable",
            fallback: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      return new Response(
        JSON.stringify({
          overview: null,
          error: "AI service failed after retries",
          fallback: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let overview;
    try {
      overview = JSON.parse(content);
    } catch {
      overview = { raw: content };
    }

    return new Response(
      JSON.stringify({
        overview,
        metadata: {
          channel,
          period: periodLabel,
          total_reviews: reviews.length,
          positive_count: posReviews.length,
          negative_count: negReviews.length,
          generated_at: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
