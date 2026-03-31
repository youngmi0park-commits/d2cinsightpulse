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
    const category = body.category || "all";
    const productId = body.product_id || null;

    // Category matching patterns
    const categoryPatterns: Record<string, string[]> = {
      TV: ["TV", "OLED", "QNED", "NanoCell", "LED"],
      TV_OLED: ["OLED", "evo"],
      TV_Large: ["QNED", "NanoCell", "86", "85", "90", "97", "98", "75"],
      TV_Lifestyle: ["StanbyME", "Objet", "Easel", "Posé", "ART"],
      Refrigerator: ["Refrigerator", "Fridge", "InstaView"],
      Washer: ["Washer", "WashTower", "Laundry"],
      Dryer: ["Dryer"],
      Dishwasher: ["Dishwasher"],
      AC: ["Air Conditioner", "Artcool", "DualCool"],
      Audio: ["Soundbar", "Speaker", "XBOOM"],
      Monitor: ["Monitor", "UltraGear", "UltraWide"],
    };

    // 1. Get top products from ALL collected reviews (not just weekly)
    const allProductIds = new Set<string>();
    let topProductsList: any[] = [];

    if (productId) {
      allProductIds.add(productId);
      const { data: prodInfo } = await sb.from("products").select("*").eq("id", productId).single();
      if (prodInfo) {
        topProductsList = [{ product_id: productId, model_number: prodInfo.model_number, display_name: prodInfo.display_name, category: prodInfo.category, region: region }];
      }
    } else {
      // Fetch top products by total review count (all time, not weekly)
      let reviewQuery = sb
        .from("reviews")
        .select("product_id, products!inner(model_number, display_name, category)")
        .in("source", ["lge_com_us", "lge_com_uk"]);

      if (region !== "all") {
        const sourceMap: Record<string, string> = { US: "lge_com_us", UK: "lge_com_uk" };
        if (sourceMap[region]) reviewQuery = reviewQuery.eq("source", sourceMap[region]);
      }

      const { data: allReviews } = await reviewQuery.limit(1000);

      const matchesCategory = (catText: string) => {
        if (category === "all") return true;
        const patterns = categoryPatterns[category] || [category];
        return patterns.some((pat: string) => catText.toLowerCase().includes(pat.toLowerCase()));
      };

      // Group by product and count
      const productCounts: Record<string, { count: number; product: any }> = {};
      for (const r of (allReviews || []) as any[]) {
        const catText = `${r.products?.category || ""} ${r.products?.display_name || ""}`;
        if (!matchesCategory(catText)) continue;
        const pid = r.product_id;
        if (!productCounts[pid]) {
          productCounts[pid] = {
            count: 0,
            product: { product_id: pid, model_number: r.products.model_number, display_name: r.products.display_name, category: r.products.category, region },
          };
        }
        productCounts[pid].count++;
      }

      topProductsList = Object.values(productCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((p) => p.product);

      for (const p of topProductsList) {
        allProductIds.add(p.product_id);
      }
    }

    if (allProductIds.size === 0) {
      return new Response(
        JSON.stringify({ insights: null, message: `No weekly review data for ${category}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch actual reviews for these products (non-lge_com content is fine for analysis, but we use lge_com)
    const productReviews: Record<string, { product: any; positive: any[]; negative: any[] }> = {};

    for (const pid of allProductIds) {
      const prodInfo = topProductsList.find(
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

## 1. 리뷰 기반 사용자군 정의 (User Group Profiling)

### 1-1. 주 사용층 (Core User Group)
리뷰 데이터에서 파악되는 핵심 사용자군을 제품별로 분석:
- 주 사용 목적
- 자주 언급되는 사용 장면(Use Scene)
- 관심사/중요 평가 기준
- 암묵적 라이프스타일 특징
- 구매 동기
- 만족 포인트
- 불만 포인트

### 1-2. 사용자 확장층 (Potential User Group)
현재 주 사용층 외에 확장 가능한 잠재 타깃을 제품별로 제안:
- 확장 가능성이 높은 타깃층
- 확장 예상 사용씬
- 해당 타깃의 관심사
- 라이프스타일/컨텍스트 제안
- 이 타깃을 잡기 위한 메시지/크리에이티브 방향

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
    "core_user_groups": [
      {
        "product": "제품명",
        "main_purpose": "주 사용 목적",
        "use_scenes": ["사용 장면1", "사용 장면2"],
        "evaluation_criteria": ["관심사/평가 기준1", "기준2"],
        "lifestyle": "암묵적 라이프스타일 특징",
        "purchase_motivation": "구매 동기",
        "satisfaction_points": ["만족 포인트1", "포인트2"],
        "pain_points": ["불만 포인트1", "포인트2"]
      }
    ],
    "potential_user_groups": [
      {
        "product": "제품명",
        "target_group": "확장 가능성이 높은 타깃층",
        "expected_use_scenes": ["확장 예상 사용씬1", "사용씬2"],
        "interests": ["해당 타깃의 관심사1", "관심사2"],
        "lifestyle_context": "라이프스타일/컨텍스트 제안",
        "creative_direction": "이 타깃을 잡기 위한 메시지/크리에이티브 방향"
      }
    ]
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
