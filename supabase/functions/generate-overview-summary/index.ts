import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const channel: string = body.channel || "lgcom";

    // ── 1) 주간 리뷰 가져오기 (최근 7일) ──
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let weeklyQuery = sb
      .from("reviews")
      .select("title, content, sentiment, sentiment_score, rating, source, products!inner(display_name, model_number, category, sub_category)")
      .gte("collected_at", weekAgo.toISOString())
      .order("collected_at", { ascending: false })
      .limit(800);

    if (channel === "lgcom") {
      weeklyQuery = weeklyQuery.like("source", "lge_com%");
    } else {
      weeklyQuery = weeklyQuery.eq("source", "reddit");
    }

    const { data: weeklyReviews, error: weeklyErr } = await weeklyQuery;
    if (weeklyErr) throw weeklyErr;

    // ── 2) 주간 데이터 부족 시 최근 30일로 확장 ──
    let reviews = weeklyReviews || [];
    let periodLabel = "최근 7일";

    if (reviews.length < 30) {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      let fallbackQuery = sb
        .from("reviews")
        .select("title, content, sentiment, sentiment_score, rating, source, products!inner(display_name, model_number, category, sub_category)")
        .gte("collected_at", monthAgo.toISOString())
        .order("collected_at", { ascending: false })
        .limit(800);

      if (channel === "lgcom") {
        fallbackQuery = fallbackQuery.like("source", "lge_com%");
      } else {
        fallbackQuery = fallbackQuery.eq("source", "reddit");
      }

      const { data: fallbackReviews, error: fbErr } = await fallbackQuery;
      if (fbErr) throw fbErr;
      reviews = fallbackReviews || [];
      periodLabel = "최근 30일";

      // 30일에도 부족하면 전체에서 최신 가져오기
      if (reviews.length < 30) {
        let allQuery = sb
          .from("reviews")
          .select("title, content, sentiment, sentiment_score, rating, source, products!inner(display_name, model_number, category, sub_category)")
          .order("collected_at", { ascending: false })
          .limit(800);

        if (channel === "lgcom") {
          allQuery = allQuery.like("source", "lge_com%");
        } else {
          allQuery = allQuery.eq("source", "reddit");
        }

        const { data: allReviews, error: allErr } = await allQuery;
        if (allErr) throw allErr;
        reviews = allReviews || [];
        periodLabel = "전체 누적";
      }
    }

    if (reviews.length === 0) {
      return new Response(
        JSON.stringify({ overview: null, message: "No reviews found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3) 데이터 분석 ──
    const posReviews = reviews.filter((r: any) => r.sentiment === "positive");
    const negReviews = reviews.filter((r: any) => r.sentiment === "negative");

    // 제품별 집계
    const productMap: Record<string, {
      name: string; model: string; category: string; subCategory: string;
      pos: number; neg: number; titles: string[]; snippets: string[];
    }> = {};

    for (const r of reviews as any[]) {
      const pName = r.products?.display_name || "Unknown";
      if (!productMap[pName]) {
        productMap[pName] = {
          name: pName, model: r.products?.model_number || "",
          category: r.products?.category || "", subCategory: r.products?.sub_category || "",
          pos: 0, neg: 0, titles: [], snippets: [],
        };
      }
      if (r.sentiment === "positive") productMap[pName].pos++;
      if (r.sentiment === "negative") productMap[pName].neg++;
      if (r.title && productMap[pName].titles.length < 10) productMap[pName].titles.push(r.title);
      // 리뷰 본문 스니펫 추가 (최대 5개, 150자 제한)
      if (r.content && productMap[pName].snippets.length < 5) {
        productMap[pName].snippets.push(r.content.slice(0, 150));
      }
    }

    const topProducts = Object.values(productMap)
      .sort((a, b) => (b.pos + b.neg) - (a.pos + a.neg))
      .slice(0, 15);

    const productSummary = topProducts.map(p =>
      `${p.name} (${p.model}, ${p.category}${p.subCategory ? ` > ${p.subCategory}` : ""}): 긍정 ${p.pos}건, 부정 ${p.neg}건\n  키워드: ${p.titles.slice(0, 5).join(", ")}\n  대표 리뷰: ${p.snippets.slice(0, 2).join(" | ")}`
    ).join("\n\n");

    // 긍정/부정 리뷰 본문 샘플
    const posSnippets = posReviews.slice(0, 30).map((r: any) =>
      `[${(r.products as any)?.display_name || "?"}] ${r.title || ""}: ${(r.content || "").slice(0, 120)}`
    ).filter(Boolean).join("\n");

    const negSnippets = negReviews.slice(0, 30).map((r: any) =>
      `[${(r.products as any)?.display_name || "?"}] ${r.title || ""}: ${(r.content || "").slice(0, 120)}`
    ).filter(Boolean).join("\n");

    const channelLabel = channel === "lgcom" ? "LG.com 공식 리뷰" : "Reddit 커뮤니티";

    // ── 4) AI 분석 요청 ──
    const systemPrompt = `You are an expert consumer insight analyst for LG Electronics. Analyze ${channelLabel} data and provide structured weekly overview in Korean. Be specific with product names and real patterns from the data. Write in a format suitable for marketing team weekly briefing. All analysis must be grounded in the actual review data provided — do not invent or hallucinate information.`;

    const userPrompt = `다음은 ${channelLabel}의 ${periodLabel} 수집된 리뷰 데이터입니다:

총 리뷰: ${reviews.length}건 (긍정 ${posReviews.length}건, 부정 ${negReviews.length}건)
분석 기간: ${periodLabel}

제품별 현황:
${productSummary}

긍정 리뷰 샘플 (${posReviews.length}건 중 상위 30건):
${posSnippets.slice(0, 2000)}

부정 리뷰 샘플 (${negReviews.length}건 중 상위 30건):
${negSnippets.slice(0, 2000)}

위 실제 데이터를 기반으로 아래 5가지 섹션을 분석해주세요. 반드시 위 데이터에 존재하는 제품명과 리뷰 내용만 활용하세요:

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
- 예: { "text": "OLED TV의 압도적인 화질 (선명함, 색감, 명암비)", "product": "LG OLED evo G5", "category": "TV" }

## 4. "비교 없이" 칭찬하는 포인트 (Unmatched Praise)
- 고객이 경쟁사 대비가 아닌 절대적으로 칭찬하는 포인트 4~5개
- 각각 고객 말투를 살린 한 줄 코멘트 (큰따옴표)

## 5. Key Takeaway (마케터용 핵심 인사이트)
- key_takeaway: 객체 배열 (3개)
- 각 항목은 주로 언급된 제품명, 긍/부정 핵심 메시지, 마케터가 바로 활용할 수 있는 액션 제안을 포함
- 형태: { "product": "제품명", "category": "TV", "positive_msg": "긍정 핵심 한 줄", "negative_msg": "부정 핵심 한 줄", "marketer_action": "마케터 액션 제안 한 줄" }

JSON 형태로 응답:
{
  "top_topics": [
    {
      "rank": 1,
      "topic": "주제명",
      "mention_pct": 40,
      "positive_pct": 95,
      "negative_pct": 5,
      "representative_comment": "대표 코멘트",
      "related_products": ["모델명1", "모델명2"]
    }
  ],
  "urgent_issues": [
    {
      "rank": 1,
      "issue": "이슈명",
      "mention_pct": 70,
      "pattern": "패턴 설명",
      "cause": "원인 설명",
      "related_products": ["모델명1"]
    }
  ],
  "recurring_praise": [{"text": "칭찬 포인트1", "product": "제품명", "category": "TV"}],
  "unmatched_praise": ["코멘트1", "코멘트2"],
  "key_takeaway": [
    {"product": "제품명", "category": "TV", "positive_msg": "긍정 핵심", "negative_msg": "부정 핵심", "marketer_action": "액션 제안"}
  ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errText}`);
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
