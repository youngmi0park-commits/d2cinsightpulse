import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALL_BV_SOURCES = [
  "lge_com_us", "lge_com_uk", "lge_com_de", "lge_com_au",
  "lge_com_in", "lge_com_tw", "lge_com_jp", "lge_com_th",
];

function getSourceFilter(region: string): string[] {
  if (region === "all") return ALL_BV_SOURCES;
  return ["lge_com_" + region.toLowerCase()];
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

    const body = await req.json().catch(() => ({}));
    const region = body.region || "all";
    const category = body.category || "all";
    const limit = body.limit || 10;
    const productId = body.product_id || null;
    const period = body.period || "weekly";
    const isCumulative = period === "cumulative";

    const categoryPatterns: Record<string, string[]> = {
      TV: ["TV", "OLED", "QNED", "NanoCell", "LED", "StanbyME"],
      TV_OLED: ["OLED", "evo"],
      TV_Large: ["QNED", "NanoCell", "86", "85", "90", "97", "98", "75"],
      TV_Lifestyle: ["StanbyME", "Objet", "Easel", "Pose", "ART"],
      Refrigerator: ["Refrigerator", "Fridge", "InstaView"],
      Washer: ["Washer", "WashTower", "Laundry"],
      Dryer: ["Dryer"],
      Dishwasher: ["Dishwasher"],
      "Air Care": ["Air Purifier", "Dehumidifier", "Air Conditioner"],
      AC: ["Air Conditioner", "Artcool", "DualCool"],
      Audio: ["Soundbar", "Speaker", "XBOOM"],
      Monitor: ["Monitor", "UltraGear", "UltraWide"],
      Vacuum: ["Vacuum", "CordZero"],
      "Air Purifier": ["Air Purifier", "PuriCare", "AeroTower"],
      Laptop: ["Laptop", "Gram", "UltraPC"],
      Microwave: ["Microwave"],
      Range: ["Range", "Oven"],
      Cooktop: ["Cooktop", "Induction"],
    };

    const sourceFilter = getSourceFilter(region);
    const weekAgo = isCumulative ? null : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Get total count for this country+category from DB
    let actualTotal = 0;
    if (isCumulative) {
      const { data: ccData } = await sb.rpc("get_category_counts_by_country", {
        p_country: region,
      });
      if (ccData) {
        if (category === "all") {
          actualTotal = (ccData as any[]).reduce((s: number, r: any) => s + Number(r.count), 0);
        } else {
          const match = (ccData as any[]).find((r: any) => r.category === category);
          actualTotal = match ? Number(match.count) : 0;
        }
      }
    } else {
      const { data: wcData } = await sb.rpc("get_weekly_category_counts_by_country", {
        p_country: region,
      });
      if (wcData) {
        if (category === "all") {
          actualTotal = (wcData as any[]).reduce((s: number, r: any) => s + Number(r.count), 0);
        } else {
          const match = (wcData as any[]).find((r: any) => r.category === category);
          actualTotal = match ? Number(match.count) : 0;
        }
      }
    }

    // 2. Fetch top products
    let allProductIds = new Set<string>();
    let filteredPos: any[] = [];
    let filteredNeg: any[] = [];

    if (productId) {
      allProductIds.add(productId);
      const { data: prodInfo } = await sb.from("products").select("*").eq("id", productId).single();
      if (prodInfo) {
        filteredPos = [{ product_id: productId, model_number: prodInfo.model_number, display_name: prodInfo.display_name, category: prodInfo.category, region, review_count: 0, avg_score: 0 }];
      }
    } else {
      const fetchLimit = category === "all" ? limit : 50;
      const topProductsRpc = isCumulative
        ? "get_lgcom_cumulative_top_products"
        : "get_lgcom_weekly_top_products";
      const { data: posProducts, error: posErr } = await sb.rpc(
        topProductsRpc,
        { p_region: region, p_sentiment: "positive", p_limit: fetchLimit }
      );
      if (posErr) throw posErr;

      const { data: negProducts } = await sb.rpc(
        topProductsRpc,
        { p_region: region, p_sentiment: "negative", p_limit: fetchLimit }
      );

      const matchesCategory = (p: any) => {
        if (category === "all") return true;
        const patterns = categoryPatterns[category] || [category];
        const catText = (p.category || "") + " " + (p.display_name || "");
        return patterns.some((pat: string) => catText.toLowerCase().includes(pat.toLowerCase()));
      };

      filteredPos = (posProducts || []).filter(matchesCategory).slice(0, limit);
      filteredNeg = (negProducts || []).filter(matchesCategory).slice(0, limit);

      for (const p of [...filteredPos, ...filteredNeg]) {
        allProductIds.add(p.product_id);
      }
    }

    if (allProductIds.size === 0) {
      return new Response(
        JSON.stringify({ report: null, message: "No weekly review data for " + category }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch weekly reviews for these products (filtered by published_at)
    const productReviews: Record<string, { product: any; positive: any[]; negative: any[]; neutral: any[] }> = {};

    for (const pid of allProductIds) {
      const prodInfo = [...filteredPos, ...filteredNeg].find((p: any) => p.product_id === pid);

      let query = sb
        .from("reviews")
        .select("title, rating, sentiment, sentiment_score, published_at, content, emotion_category")
        .eq("product_id", pid)
        .in("source", sourceFilter)
        .order("published_at", { ascending: false })
        .limit(isCumulative ? 500 : 200);

      if (weekAgo) {
        query = query.gte("published_at", weekAgo);
      }

      const { data: reviews } = await query;

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

    // 4. Build data summary for AI
    const reviewDataSummary = Object.values(productReviews)
      .map((pr) => {
        const allReviews = [...pr.positive, ...pr.negative, ...pr.neutral];
        const ratedReviews = allReviews.filter((r: any) => r.rating);
        const avgRating = ratedReviews.length > 0
          ? ratedReviews.reduce((s: number, r: any) => s + r.rating, 0) / ratedReviews.length
          : 0;
        const posTitles = pr.positive.map((r: any) => r.title).filter(Boolean).slice(0, 25);
        const negTitles = pr.negative.map((r: any) => r.title).filter(Boolean).slice(0, 25);
        const emotions = allReviews.map((r: any) => r.emotion_category).filter(Boolean);
        const emotionCounts: Record<string, number> = {};
        for (const e of emotions) { emotionCounts[e] = (emotionCounts[e] || 0) + 1; }

        return "## " + pr.product.display_name + " (" + pr.product.model_number + ") - " + pr.product.category + "\nRegion: " + pr.product.region + "\nSampled reviews: " + allReviews.length + " (Positive: " + pr.positive.length + ", Negative: " + pr.negative.length + ", Neutral: " + pr.neutral.length + ")\nAverage rating: " + avgRating.toFixed(1) + "\nKeywords: " + (pr.product.keywords || []).join(", ") + "\nPositive review titles: " + (posTitles.join(" | ") || "N/A") + "\nNegative review titles: " + (negTitles.join(" | ") || "N/A") + "\nEmotion distribution: " + (Object.entries(emotionCounts).map(([k, v]) => k + "(" + v + ")").join(", ") || "N/A");
      })
      .join("\n\n");

    // Compute sampled aggregate stats
    const allPos = Object.values(productReviews).reduce((s, pr) => s + pr.positive.length, 0);
    const allNeg = Object.values(productReviews).reduce((s, pr) => s + pr.negative.length, 0);
    const allNeutral = Object.values(productReviews).reduce((s, pr) => s + pr.neutral.length, 0);
    const sampledTotal = allPos + allNeg + allNeutral;

    // Use actual weekly total from DB
    const totalReviews = actualTotal > 0 ? actualTotal : sampledTotal;
    const posPct = sampledTotal > 0 ? Math.round(allPos / sampledTotal * 100) : 0;
    const negPct = sampledTotal > 0 ? Math.round(allNeg / sampledTotal * 100) : 0;
    const neuPct = 100 - posPct - negPct;

    const periodLabel = isCumulative ? "전체 누적" : "최근 7일";
    const periodFocus = isCumulative
      ? "\n\nPERIOD FOCUS — CUMULATIVE: 전체 누적 데이터를 바탕으로 장기 트렌드, 반복적으로 등장하는 강점/약점 패턴, 제품 라이프사이클 전반의 인사이트에 집중하세요. '이번 주' 같은 단기 표현은 사용하지 말고, '지속적으로', '꾸준히', '장기간' 같은 누적 관점의 표현을 사용하세요. top3_insights는 누적 트렌드 중심으로 작성하세요."
      : "\n\nPERIOD FOCUS — WEEKLY: 최근 7일 신규 리뷰만을 분석하여 이번 주의 변화/이슈/신호에 집중하세요. '이번 주', '최근 7일', '신규 발생' 같은 단기 시점 표현을 적극 사용하세요. top3_insights는 이번 주 핵심 변화 중심으로 작성하세요.";
    const categoryGuard = category !== "all"
      ? "\nCRITICAL CATEGORY RULE: You are analyzing the \"" + category + "\" category ONLY. When excerpting or paraphrasing reviews, ONLY include opinions that directly relate to " + category + " products. If a review mentions other appliance categories (e.g. a Washer review mentioning a dishwasher, or a TV review mentioning a soundbar), EXCLUDE those cross-category mentions entirely. Focus strictly on feedback about " + category + " product features, performance, and experience."
      : "\nWhen analyzing across all categories, clearly attribute each insight to its specific category. Do NOT mix feedback from different categories (e.g. do not include dishwasher feedback under Washer analysis).";

    const systemPrompt = "You are a global brand strategist and consumer insight analyst for LG Electronics.\nAnalyze LG.com review data and produce a structured " + (isCumulative ? "CUMULATIVE (long-term, all-time)" : "WEEKLY (last 7 days only)") + " insight report in Korean.\nFocus on \"Why LG?\" \u2014 what makes customers choose and love LG products.\nBe specific with product names and concrete patterns from the data.\nIMPORTANT: Do NOT expose any original review text. Only use extracted keywords and patterns.\nAll consumer quotes must be anonymized and paraphrased." + categoryGuard + periodFocus;

    const userPrompt = "\uB2E4\uC74C\uC740 LG.com\uC5D0\uC11C " + (isCumulative ? "\uC218\uC9D1\uB41C \uC804\uCCB4 \uB204\uC801" : "\uC774\uBC88 \uC8FC \uC218\uC9D1\uB41C") + " \uB9AC\uBDF0 \uB370\uC774\uD130 \uC694\uC57D\uC785\uB2C8\uB2E4:\n\n\uC804\uCCB4 \uB9AC\uBDF0 \uC218: " + totalReviews + "\uAC74 (\uAE0D\uC815 " + posPct + "% / \uBD80\uC815 " + negPct + "% / \uC911\uB9BD " + neuPct + "%)\n\uBD84\uC11D \uAE30\uAC04: " + periodLabel + "\n\uBD84\uC11D \uC9C0\uC5ED: " + (region === "all" ? "\uC804\uCCB4" : region) + "\n\uCE74\uD14C\uACE0\uB9AC: " + (category === "all" ? "\uC804\uCCB4" : category) + "\n\n" + reviewDataSummary + "\n\n\uC704 \uB370\uC774\uD130\uB97C \uAE30\uBC18\uC73C\uB85C \uC544\uB798 6\uAC1C \uC139\uC158\uC758 " + (isCumulative ? "\uB204\uC801 \uBD84\uC11D" : "\uC8FC\uAC04") + " \uB9AC\uD3EC\uD2B8\uB97C JSON\uC73C\uB85C \uC0DD\uC131\uD558\uC138\uC694.\n\n{\n  \"executive_summary\": {\n    \"period\": \"" + periodLabel + "\",\n    \"total_reviews\": " + totalReviews + ",\n    \"channel_reviews\": " + totalReviews + ",\n    \"avg_rating\": \"\uCC38\uACE0\uC6A9 \uD3C9\uADE0 \uD3C9\uC810\",\n    \"sentiment_ratio\": {\n      \"positive_pct\": " + posPct + ",\n      \"negative_pct\": " + negPct + ",\n      \"neutral_pct\": " + neuPct + "\n    },\n    \"top3_insights\": [\"\uC778\uC0AC\uC774\uD2B81\", \"\uC778\uC0AC\uC774\uD2B82\", \"\uC778\uC0AC\uC774\uD2B83\"]\n  },\n  \"top5_themes\": [{\"theme\": \"\uC8FC\uC81C\uBA85\", \"mention_pct\": \"\uC5B8\uAE09 \uBE44\uC728\", \"positive_pct\": \"\uAE0D\uC815 \uBE44\uC728\", \"negative_pct\": \"\uBD80\uC815 \uBE44\uC728\", \"representative_quote\": \"\uC775\uBA85 \uCC98\uB9AC\uB41C \uB300\uD45C \uB9AC\uBDF0 \uC758\uC5ED\", \"related_products\": [\"\uAD00\uB828 \uC81C\uD488\uAD70\"]}],\n  \"negative_priority_top3\": [{\"issue\": \"\uBD80\uC815 \uC774\uC288\", \"mention_pct\": \"\uBD80\uC815 \uC5B8\uAE09 \uBE44\uC728\", \"recurring_pattern\": \"\uBC18\uBCF5 \uB4F1\uC7A5 \uD328\uD134\", \"root_cause\": \"Why \uC911\uC2EC \uC6D0\uC778 \uBD84\uC11D\", \"related_products\": [\"\uAD00\uB828 \uC81C\uD488\"]}],\n  \"strengths\": {\"repeated_praise\": [\"\uBC18\uBCF5 \uCE6D\uCC2C \uD3EC\uC778\uD2B8\"], \"unconditional_praise\": [\"\uBE44\uAD50 \uC5C6\uC774 \uCE6D\uCC2C\uD558\uB294 \uD3EC\uC778\uD2B8\"], \"competitive_advantage\": [{\"point\": \"\uC6B0\uC704 \uD3EC\uC778\uD2B8\", \"vs_competitor\": \"\uBE44\uAD50 \uB300\uC0C1\", \"evidence\": \"\uB9AC\uBDF0 \uAE30\uBC18 \uADFC\uAC70\"}]},\n  \"action_items\": {\"product_team\": [{\"item\": \"\uAC1C\uC120 \uD56D\uBAA9\", \"priority\": \"\uB192\uC74C/\uC911\uAC04/\uB0AE\uC74C\", \"detail\": \"\uC0C1\uC138 \uC124\uBA85\"}], \"cs_team\": [{\"item\": \"\uB300\uC751 \uD56D\uBAA9\", \"detail\": \"\uC0C1\uC138\"}], \"marketing_team\": [{\"satisfaction_message\": \"\uAC15\uD654 \uD3EC\uC778\uD2B8\", \"copy_suggestion\": \"\uACE0\uAC1D \uD45C\uD604 \uAE30\uBC18 \uCE74\uD53C \uC81C\uC548\"}]},\n  \"product_insights\": [{\"product_name\": \"\uC81C\uD488\uBA85\", \"category\": \"\uCE74\uD14C\uACE0\uB9AC\", \"review_count\": 0, \"positive_pct\": \"\uAE0D\uC815 \uBE44\uC728\", \"negative_pct\": \"\uBD80\uC815 \uBE44\uC728\", \"top_praise_keywords\": [\"\uCE6D\uCC2C \uD0A4\uC6CC\uB4DC\"], \"top_complaint_keywords\": [\"\uBD88\uB9CC \uD0A4\uC6CC\uB4DC\"], \"key_insight\": \"\uD575\uC2EC \uC778\uC0AC\uC774\uD2B8 1\uC904\", \"action_suggestion\": \"\uC561\uC158 \uC81C\uC548 1\uC904\"}],\n  \"deep_insights\": {\"ux_strategy\": {\"pain_flow\": [\"\uACE0\uAC1D\uC774 \uBD88\uD3B8\uC744 \uB290\uB07C\uB294 \uACBD\uD5D8 \uD750\uB984\"], \"stage_issues\": {\"pre_use\": \"\uC0AC\uC6A9 \uC804 \uBB38\uC81C\", \"during_use\": \"\uC0AC\uC6A9 \uC911 \uBB38\uC81C\", \"post_use\": \"\uC0AC\uC6A9 \uD6C4 \uBB38\uC81C\"}, \"high_impact_improvements\": [\"\uAC1C\uC120 \uC2DC \uB9CC\uC871\uB3C4 \uC0C1\uC2B9 \uAC00\uB2A5\uC131 \uB192\uC740 \uD3EC\uC778\uD2B8\"]}, \"product_quality_strategy\": {\"recurring_defects\": [\"\uBC18\uBCF5 \uACB0\uD568/\uC131\uB2A5 \uC774\uC288\"], \"expectation_disappointment\": [\"\uAE30\uB300 \uB300\uBE44 \uC2E4\uB9DD \uD3EC\uC778\uD2B8\"], \"trust_impact_expressions\": [\"\uD488\uC9C8 \uC2E0\uB8B0\uB3C4\uC5D0 \uC601\uD5A5\uC744 \uC8FC\uB294 \uD45C\uD604\"]}, \"marketing_comms_strategy\": {\"organic_praise_sentences\": [\"\uACE0\uAC1D\uC774 \uC790\uBC1C\uC801\uC73C\uB85C \uC0AC\uC6A9\uD558\uB294 \uCE6D\uCC2C \uBB38\uC7A5\"], \"copy_candidates\": [\"\uCE74\uD53C \uD6C4\uBCF4\"], \"avoid_expressions\": [\"\uD53C\uD574\uC57C \uD560 \uD45C\uD604\"]}}\n}";

    // 5. Call AI with retry/backoff + model fallback for transient upstream 5xx
    const models = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "google/gemini-3-flash-preview"];
    let aiResponse: Response | null = null;
    let lastErrText = "";
    outer: for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          aiResponse = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: "Bearer " + lovableApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
              }),
            }
          );
          if (aiResponse.ok) break outer;
          // Don't retry on auth/quota/rate
          if (aiResponse.status === 401 || aiResponse.status === 402 || aiResponse.status === 429) break outer;
          lastErrText = await aiResponse.text();
          console.warn(`AI gateway ${aiResponse.status} (model=${model}, attempt=${attempt + 1}): ${lastErrText.slice(0, 200)}`);
          if (aiResponse.status >= 500) {
            await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)));
            continue;
          }
          break; // other 4xx — try next model
        } catch (e) {
          lastErrText = e instanceof Error ? e.message : String(e);
          console.warn(`AI gateway fetch threw (model=${model}, attempt=${attempt + 1}):`, lastErrText);
          await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)));
        }
      }
    }
    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: "AI_GATEWAY_ERROR", message: "AI 게이트웨이에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.", detail: lastErrText.slice(0, 300) }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "RATE_LIMITED", message: "AI 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "PAYMENT_REQUIRED", message: "Lovable AI 크레딧이 부족합니다. Settings → Workspace → Usage에서 크레딧을 충전해주세요." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI_GATEWAY_ERROR", status: aiResponse.status, message: "AI 게이트웨이 일시 오류입니다. 잠시 후 다시 시도해주세요." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Safe JSON parsing - AI Gateway can return empty body on transient errors
    const rawText = await aiResponse.text();
    let aiData: any = {};
    if (rawText && rawText.trim().length > 0) {
      try {
        aiData = JSON.parse(rawText);
      } catch (e) {
        console.error("Failed to parse AI gateway response:", e, "raw:", rawText.slice(0, 200));
      }
    } else {
      console.error("AI gateway returned empty body");
    }
    const content = aiData?.choices?.[0]?.message?.content || "";
    let report: any;
    if (content && content.trim().length > 0) {
      try {
        // strip optional markdown fences
        const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        report = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse AI content as JSON:", e);
        report = { raw: content };
      }
    } else {
      report = {
        executive_summary: {
          period: periodLabel,
          total_reviews: totalReviews,
          channel_reviews: totalReviews,
          sentiment_ratio: { positive_pct: posPct, negative_pct: negPct, neutral_pct: neuPct },
          top3_insights: ["AI 분석 응답이 비어 있어 요약을 생성하지 못했습니다. 잠시 후 다시 시도해주세요."],
        },
        top5_themes: [],
        negative_priority_top3: [],
        strengths: { repeated_praise: [], unconditional_praise: [], competitive_advantage: [] },
        action_items: { product_team: [], cs_team: [], marketing_team: [] },
        product_insights: [],
      };
    }

    // Ensure executive_summary uses actual total
    if (report.executive_summary) {
      report.executive_summary.total_reviews = totalReviews;
      report.executive_summary.channel_reviews = totalReviews;
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
        period,
        period_label: periodLabel,
        total_reviews: totalReviews,
        total: actualTotal,
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
