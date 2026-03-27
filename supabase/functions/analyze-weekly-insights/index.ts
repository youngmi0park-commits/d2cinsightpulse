import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const region = body.region || "all";
    const limit = body.limit || 5;

    // 1. Get top 5 weekly products by review count
    const { data: topProducts, error: topErr } = await sb.rpc(
      "get_lgcom_weekly_top_products",
      { p_region: region, p_sentiment: "positive", p_limit: limit }
    );
    if (topErr) throw topErr;

    // Also get negative top for framework 3
    const { data: negProducts } = await sb.rpc(
      "get_lgcom_weekly_top_products",
      { p_region: region, p_sentiment: "negative", p_limit: limit }
    );

    // Collect all unique product IDs
    const allProductIds = new Set<string>();
    for (const p of [...(topProducts || []), ...(negProducts || [])]) {
      allProductIds.add(p.product_id);
    }

    if (allProductIds.size === 0) {
      return new Response(
        JSON.stringify({ insights: null, message: "No weekly review data available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch actual reviews for these products (non-lge_com content is fine for analysis, but we use lge_com)
    const productReviews: Record<string, { product: any; positive: any[]; negative: any[] }> = {};

    for (const pid of allProductIds) {
      const prodInfo = [...(topProducts || []), ...(negProducts || [])].find(
        (p: any) => p.product_id === pid
      );

      const { data: reviews } = await sb
        .from("reviews")
        .select("title, rating, sentiment, sentiment_score, published_at")
        .eq("product_id", pid)
        .in("source", ["lge_com_us", "lge_com_uk"])
        .order("published_at", { ascending: false })
        .limit(100);

      const pos = (reviews || []).filter((r: any) => r.sentiment === "positive");
      const neg = (reviews || []).filter((r: any) => r.sentiment === "negative");

      productReviews[pid] = {
        product: {
          model_number: prodInfo?.model_number || "Unknown",
          display_name: prodInfo?.display_name || "Unknown",
          category: prodInfo?.category || "General",
          region: prodInfo?.region || region,
        },
        positive: pos.slice(0, 50),
        negative: neg.slice(0, 50),
      };
    }

    // 3. Build prompt for AI analysis
    const reviewSummary = Object.values(productReviews)
      .map((pr) => {
        const posKeywords = pr.positive
          .map((r: any) => r.title)
          .filter(Boolean)
          .slice(0, 20);
        const negKeywords = pr.negative
          .map((r: any) => r.title)
          .filter(Boolean)
          .slice(0, 20);
        return `## ${pr.product.display_name} (${pr.product.model_number}) - ${pr.product.category}
Region: ${pr.product.region}
Positive reviews: ${pr.positive.length}건, Keywords: ${posKeywords.join(", ") || "N/A"}
Negative reviews: ${pr.negative.length}건, Keywords: ${negKeywords.join(", ") || "N/A"}
Rating distribution: ${pr.positive.concat(pr.negative).map((r: any) => r.rating).filter(Boolean).join(", ")}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a global brand strategist and consumer insight analyst for LG Electronics. 
Analyze LG.com review data and provide actionable marketing insights in Korean.
Focus on "Why LG?" - what makes customers choose and love LG products.
Be specific with examples from the data. Use marketing-ready language.
IMPORTANT: Do NOT expose any original review text. Only use extracted keywords and patterns for analysis.`;

    const userPrompt = `다음은 LG.com에서 이번 주 리뷰가 가장 많은 상위 제품들의 리뷰 데이터 요약입니다:

${reviewSummary}

위 데이터를 기반으로 다음 3가지 프레임워크로 분석해주세요. 각 프레임워크별로 제품별 구체적 인사이트를 제공하세요.

## 1. 페르소나 기반 타겟 확장 인사이트
- **의외의 사용성(Edge Cases)**: 마케팅 상세페이지에 없던 방식이나 장소에서 제품을 쓰는 고객층
- **페르소나별 킬러 포인트**: 1인 가구, 워킹맘, 테크 헤비유저 등 각 타겟군의 AHA Moment
- **타겟 확장 제안**: 주류 타겟 외 잠재 고객군과 공략 마케팅 메시지

## 2. JTBD(Jobs to be Done) 프레임워크 분석
- **구매 전 불안 요소(Anxiety)**: 고객이 구매 버튼 전 가장 걱정한 부분
- **사용 후 안도감(Delight)**: 불안이 해소된 방식과 추천 시 가장 많이 언급하는 단어
- **경쟁사 이탈 포인트(Switching Point)**: 타사에서 LG로 넘어온 결정적 이유

## 3. 부정 리뷰 기반 CRM 및 신제품 기획 인사이트
- **기대치와 현실의 괴리(Expectation Gap)**: 광고/설명과 실제 성능 간 배신감 포인트
- **유료 서비스 기회 포착**: 추가 비용 지불해서라도 해결하고 싶어하는 문제
- **CRM 대응 전략**: 부정 리뷰 고객의 마음을 돌리기 위한 즉각적 보상/커뮤니케이션 가이드

각 섹션을 JSON 형태로 구조화해서 응답해주세요:
{
  "persona_insights": {
    "edge_cases": [{"product": "제품명", "insight": "인사이트", "marketing_angle": "마케팅 활용 방안"}],
    "killer_points": [{"persona": "페르소나", "product": "제품명", "aha_moment": "킬러 포인트", "message": "추천 마케팅 메시지"}],
    "target_expansion": [{"new_target": "새로운 타겟", "product": "제품명", "rationale": "근거", "message": "공략 메시지"}]
  },
  "jtbd_insights": {
    "anxiety": [{"product": "제품명", "concern": "불안 요소", "frequency": "빈도(높음/중간/낮음)"}],
    "delight": [{"product": "제품명", "resolution": "해소 방식", "recommend_words": ["추천 키워드"]}],
    "switching_points": [{"product": "제품명", "from_competitor": "이전 브랜드", "decisive_reason": "결정적 이유"}]
  },
  "negative_insights": {
    "expectation_gap": [{"product": "제품명", "gap_description": "괴리 설명", "severity": "심각도(높음/중간/낮음)"}],
    "paid_service_opportunities": [{"product": "제품명", "pain_point": "페인포인트", "service_idea": "서비스 기회"}],
    "crm_strategy": [{"product": "제품명", "issue": "이슈", "response": "대응 전략", "compensation": "보상 방안"}]
  },
  "summary": "전체 요약 (2-3줄)"
}`;

    // 4. Call AI
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let insights;
    try {
      insights = JSON.parse(content);
    } catch {
      insights = { raw: content };
    }

    // Add metadata
    const result = {
      insights,
      metadata: {
        analyzed_products: Object.values(productReviews).map((pr) => ({
          model_number: pr.product.model_number,
          display_name: pr.product.display_name,
          category: pr.product.category,
          positive_count: pr.positive.length,
          negative_count: pr.negative.length,
        })),
        region,
        generated_at: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
