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
    const category = body.category || "all";
    const limit = body.limit || 10;

    const categoryPatterns: Record<string, string[]> = {
      TV: ["TV", "OLED", "QNED", "NanoCell", "LED", "StanbyME"],
      Refrigerator: ["Refrigerator", "Fridge", "InstaView"],
      Washer: ["Washer", "Dryer", "WashTower", "Laundry"],
      "Air Care": ["Air Purifier", "Dehumidifier", "Air Conditioner"],
      Audio: ["Soundbar", "Speaker", "XBOOM"],
    };

    // 1. Fetch top products
    const fetchLimit = category === "all" ? limit : 50;
    const { data: posProducts, error: posErr } = await sb.rpc(
      "get_lgcom_weekly_top_products",
      { p_region: region, p_sentiment: "positive", p_limit: fetchLimit }
    );
    if (posErr) throw posErr;

    const { data: negProducts } = await sb.rpc(
      "get_lgcom_weekly_top_products",
      { p_region: region, p_sentiment: "negative", p_limit: fetchLimit }
    );

    const matchesCategory = (p: any) => {
      if (category === "all") return true;
      const patterns = categoryPatterns[category] || [category];
      const catText = `${p.category || ""} ${p.display_name || ""}`.toLowerCase();
      return patterns.some((pat: string) => catText.toLowerCase().includes(pat.toLowerCase()));
    };

    const filteredPos = (posProducts || []).filter(matchesCategory).slice(0, limit);
    const filteredNeg = (negProducts || []).filter(matchesCategory).slice(0, limit);

    const allProductIds = new Set<string>();
    for (const p of [...filteredPos, ...filteredNeg]) {
      allProductIds.add(p.product_id);
    }

    if (allProductIds.size === 0) {
      return new Response(
        JSON.stringify({ report: null, message: `No weekly review data for ${category}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch reviews for these products
    const productReviews: Record<string, { product: any; positive: any[]; negative: any[]; neutral: any[] }> = {};

    for (const pid of allProductIds) {
      const prodInfo = [...filteredPos, ...filteredNeg].find((p: any) => p.product_id === pid);

      const sourceFilter = region === "all"
        ? ["lge_com_us", "lge_com_uk"]
        : [`lge_com_${region.toLowerCase()}`];

      const { data: reviews } = await sb
        .from("reviews")
        .select("title, rating, sentiment, sentiment_score, published_at, content, emotion_category")
        .eq("product_id", pid)
        .in("source", sourceFilter)
        .order("published_at", { ascending: false })
        .limit(200);

      const pos = (reviews || []).filter((r: any) => r.sentiment === "positive");
      const neg = (reviews || []).filter((r: any) => r.sentiment === "negative");
      const neutral = (reviews || []).filter((r: any) => r.sentiment === "neutral" || !r.sentiment);

      productReviews[pid] = {
        product: {
          model_number: prodInfo?.model_number || "Unknown",
          display_name: prodInfo?.display_name || "Unknown",
          category: prodInfo?.category || "General",
          region: prodInfo?.region || region,
          keywords: prodInfo?.keywords || [],
        },
        positive: pos.slice(0, 80),
        negative: neg.slice(0, 80),
        neutral: neutral.slice(0, 30),
      };
    }

    // 3. Build data summary for AI (no raw review text exposed)
    const reviewDataSummary = Object.values(productReviews)
      .map((pr) => {
        const allReviews = [...pr.positive, ...pr.negative, ...pr.neutral];
        const avgRating = allReviews.filter((r: any) => r.rating).reduce((s: number, r: any) => s + r.rating, 0) / (allReviews.filter((r: any) => r.rating).length || 1);
        const posTitles = pr.positive.map((r: any) => r.title).filter(Boolean).slice(0, 25);
        const negTitles = pr.negative.map((r: any) => r.title).filter(Boolean).slice(0, 25);
        const emotions = allReviews.map((r: any) => r.emotion_category).filter(Boolean);
        const emotionCounts: Record<string, number> = {};
        for (const e of emotions) { emotionCounts[e] = (emotionCounts[e] || 0) + 1; }

        return `## ${pr.product.display_name} (${pr.product.model_number}) — ${pr.product.category}
Region: ${pr.product.region}
Total reviews: ${allReviews.length}건 (Positive: ${pr.positive.length}, Negative: ${pr.negative.length}, Neutral: ${pr.neutral.length})
Average rating: ${avgRating.toFixed(1)}
Keywords: ${(pr.product.keywords || []).join(", ")}
Positive review titles: ${posTitles.join(" | ") || "N/A"}
Negative review titles: ${negTitles.join(" | ") || "N/A"}
Emotion distribution: ${Object.entries(emotionCounts).map(([k, v]) => `${k}(${v})`).join(", ") || "N/A"}`;
      })
      .join("\n\n");

    // Compute aggregate stats
    const allPos = Object.values(productReviews).reduce((s, pr) => s + pr.positive.length, 0);
    const allNeg = Object.values(productReviews).reduce((s, pr) => s + pr.negative.length, 0);
    const allNeutral = Object.values(productReviews).reduce((s, pr) => s + pr.neutral.length, 0);
    const totalReviews = allPos + allNeg + allNeutral;

    const systemPrompt = `You are a global brand strategist and consumer insight analyst for LG Electronics.
Analyze LG.com review data and produce a structured weekly insight report in Korean.
Focus on "Why LG?" — what makes customers choose and love LG products.
Be specific with product names and concrete patterns from the data.
IMPORTANT: Do NOT expose any original review text. Only use extracted keywords and patterns.
All consumer quotes must be anonymized and paraphrased.`;

    const userPrompt = `다음은 LG.com에서 이번 주 수집된 리뷰 데이터 요약입니다:

전체 리뷰 수: ${totalReviews}건 (긍정 ${allPos} / 부정 ${allNeg} / 중립 ${allNeutral})
분석 지역: ${region === "all" ? "전체" : region}
카테고리: ${category === "all" ? "전체" : category}

${reviewDataSummary}

위 데이터를 기반으로 아래 6개 섹션의 주간 리포트를 JSON으로 생성하세요.

{
  "executive_summary": {
    "period": "분석 기간 (예: 2024.01.20 ~ 2024.01.26)",
    "total_reviews": ${totalReviews},
    "channel_reviews": ${totalReviews},
    "avg_rating": "참고용 평균 평점",
    "sentiment_ratio": {
      "positive_pct": ${totalReviews > 0 ? Math.round(allPos / totalReviews * 100) : 0},
      "negative_pct": ${totalReviews > 0 ? Math.round(allNeg / totalReviews * 100) : 0},
      "neutral_pct": ${totalReviews > 0 ? Math.round(allNeutral / totalReviews * 100) : 0}
    },
    "top3_insights": ["인사이트1 (의사결정에 바로 활용 가능한 수준)", "인사이트2", "인사이트3"]
  },

  "top5_themes": [
    {
      "theme": "주제명",
      "mention_pct": "언급 비율 (예: 32%)",
      "positive_pct": "긍정 비율",
      "negative_pct": "부정 비율",
      "representative_quote": "익명 처리된 대표 리뷰 의역 (1~2문장)",
      "related_products": ["관련 제품군"]
    }
  ],

  "negative_priority_top3": [
    {
      "issue": "부정 이슈",
      "mention_pct": "부정 언급 비율",
      "recurring_pattern": "반복 등장 패턴",
      "root_cause": "Why 중심 원인 분석",
      "related_products": ["관련 제품"]
    }
  ],

  "strengths": {
    "repeated_praise": ["반복 칭찬 포인트"],
    "unconditional_praise": ["비교 없이 칭찬하는 포인트"],
    "competitive_advantage": [{"point": "우위 포인트", "vs_competitor": "비교 대상", "evidence": "리뷰 기반 근거"}]
  },

  "action_items": {
    "product_team": [{"item": "개선 항목", "priority": "높음/중간/낮음", "detail": "상세 설명"}],
    "cs_team": [{"item": "대응 항목", "detail": "상세 설명"}],
    "marketing_team": [{"satisfaction_message": "강화 포인트", "copy_suggestion": "고객 표현 기반 카피 제안"}]
  },

  "product_insights": [
    {
      "product_name": "제품명",
      "category": "카테고리",
      "review_count": 0,
      "positive_pct": "긍정 비율",
      "negative_pct": "부정 비율",
      "top_praise_keywords": ["칭찬 키워드"],
      "top_complaint_keywords": ["불만 키워드"],
      "key_insight": "핵심 인사이트 1줄",
      "action_suggestion": "액션 제안 1줄"
    }
  ],

  "deep_insights": {
    "ux_strategy": {
      "pain_flow": ["고객이 불편을 느끼는 경험 흐름"],
      "stage_issues": {"pre_use": "사용 전 문제", "during_use": "사용 중 문제", "post_use": "사용 후 문제"},
      "high_impact_improvements": ["개선 시 만족도 상승 가능성 높은 포인트"]
    },
    "product_quality_strategy": {
      "recurring_defects": ["반복 결함/성능 이슈"],
      "expectation_disappointment": ["기대 대비 실망 포인트"],
      "trust_impact_expressions": ["품질 신뢰도에 영향을 주는 표현"]
    },
    "marketing_comms_strategy": {
      "organic_praise_sentences": ["고객이 자발적으로 사용하는 칭찬 문장 (익명화)"],
      "copy_candidates": ["상세페이지/광고 활용 가능 카피 후보"],
      "avoid_expressions": ["피해야 할 표현 / 오해 소지 포인트"]
    }
  }
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
    let report;
    try {
      report = JSON.parse(content);
    } catch {
      report = { raw: content };
    }

    const result = {
      report,
      metadata: {
        analyzed_products: Object.values(productReviews).map((pr) => ({
          model_number: pr.product.model_number,
          display_name: pr.product.display_name,
          category: pr.product.category,
          positive_count: pr.positive.length,
          negative_count: pr.negative.length,
          neutral_count: pr.neutral.length,
        })),
        region,
        category,
        total_reviews: totalReviews,
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
