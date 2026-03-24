import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BV_BASE_URL = "https://stg.api.bazaarvoice.com";
const BV_CLIENT = "lgelectronics-en";

// LG UK product categories to crawl
const UK_PRODUCT_CATEGORIES = [
  { filter: "categoryid:refrigerators", category: "Refrigerator" },
  { filter: "categoryid:washing-machines", category: "Washer" },
  { filter: "categoryid:tumble-dryers", category: "Dryer" },
  { filter: "categoryid:tvs", category: "TV" },
  { filter: "categoryid:monitors", category: "Monitor" },
  { filter: "categoryid:soundbars", category: "Soundbar" },
  { filter: "categoryid:laptops", category: "Laptop" },
  { filter: "categoryid:air-conditioners", category: "Air Conditioner" },
  { filter: "categoryid:dishwashers", category: "Dishwasher" },
];

// Issue tag detection
const ISSUE_TAG_MAP: Record<string, { keywords: string[]; tag: string }[]> = {
  Refrigerator: [
    { keywords: ["compressor", "linear compressor"], tag: "Compressor_Issue" },
    { keywords: ["cooling", "not cooling", "warm", "temperature"], tag: "Cooling_Issue" },
    { keywords: ["ice maker", "craft ice"], tag: "Ice_Maker_Issue" },
    { keywords: ["instaview", "door-in-door"], tag: "InstaView_Feature" },
    { keywords: ["food spoil", "rotten"], tag: "Food_Spoilage" },
    { keywords: ["noise", "loud"], tag: "Noise_Issue" },
  ],
  Washer: [
    { keywords: ["thinq", "app"], tag: "ThinQ_App_Issue" },
    { keywords: ["washtower", "wash tower"], tag: "WashTower" },
    { keywords: ["noise", "loud", "vibrat"], tag: "Noise_Issue" },
    { keywords: ["steam", "allergen"], tag: "Steam_Cycle" },
  ],
  TV: [
    { keywords: ["burn-in", "burn in", "retention"], tag: "Burn_In" },
    { keywords: ["webos", "smart"], tag: "WebOS_Feature" },
    { keywords: ["hdr", "dolby vision"], tag: "HDR_Feature" },
  ],
};

function detectIssueTags(content: string, category: string): string[] {
  const tags: string[] = [];
  const lower = content.toLowerCase();
  for (const { keywords, tag } of (ISSUE_TAG_MAP[category] || [])) {
    if (keywords.some(kw => lower.includes(kw))) tags.push(tag);
  }
  return tags;
}

function simpleSentiment(rating: number | null, text: string): { sentiment: string; score: number } {
  if (rating !== null) {
    if (rating >= 4) return { sentiment: "positive", score: rating / 5 };
    if (rating <= 2) return { sentiment: "negative", score: rating / 5 };
    return { sentiment: "neutral", score: 0.5 };
  }
  const lower = text.toLowerCase();
  const pos = ["great", "excellent", "love", "amazing", "perfect", "recommend", "fantastic", "impressed"];
  const neg = ["terrible", "worst", "broken", "disappointed", "refund", "waste", "awful", "regret"];
  const posCount = pos.filter(w => lower.includes(w)).length;
  const negCount = neg.filter(w => lower.includes(w)).length;
  if (posCount > negCount) return { sentiment: "positive", score: 0.7 + posCount * 0.05 };
  if (negCount > posCount) return { sentiment: "negative", score: 0.3 - negCount * 0.05 };
  return { sentiment: "neutral", score: 0.5 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BV_API_KEY = Deno.env.get("BAZAARVOICE_UK_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!BV_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "BAZAARVOICE_UK_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing Supabase env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let maxPerCategory = 20;
  let categories = UK_PRODUCT_CATEGORIES;
  try {
    const body = await req.json();
    if (body.maxPerCategory) maxPerCategory = body.maxPerCategory;
    if (body.categories?.length) {
      categories = UK_PRODUCT_CATEGORIES.filter(c =>
        body.categories.some((bc: string) => c.category.toLowerCase().includes(bc.toLowerCase()))
      );
    }
  } catch { /* defaults */ }

  const { data: logEntry } = await supabase
    .from("collection_logs")
    .insert({ source: "bazaarvoice_uk", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  let totalCollected = 0;
  const errors: string[] = [];
  const categoryStats: Record<string, number> = {};

  try {
    for (const cat of categories) {
      categoryStats[cat.category] = 0;
      console.log(`[BV-UK] Fetching ${cat.category} reviews...`);

      try {
        // Bazaarvoice Conversations API - Reviews endpoint
        const url = new URL(`${BV_BASE_URL}/data/reviews.json`);
        url.searchParams.set("apiversion", "5.4");
        url.searchParams.set("passkey", BV_API_KEY);
        url.searchParams.set("Filter", cat.filter);
        url.searchParams.set("Sort", "SubmissionTime:desc");
        url.searchParams.set("Limit", String(maxPerCategory));
        url.searchParams.set("Include", "Products");
        url.searchParams.set("Stats", "Reviews");

        console.log(`[BV-UK] URL: ${url.toString().replace(BV_API_KEY, "***")}`);

        const res = await fetch(url.toString());
        if (!res.ok) {
          const errText = await res.text();
          console.error(`[BV-UK] API error ${res.status}: ${errText.slice(0, 500)}`);
          errors.push(`${cat.category}: API ${res.status}`);
          continue;
        }

        const data = await res.json();
        
        if (data.HasErrors) {
          const errMsgs = data.Errors?.map((e: any) => e.Message).join("; ") || "Unknown BV error";
          console.error(`[BV-UK] BV Error: ${errMsgs}`);
          errors.push(`${cat.category}: ${errMsgs}`);
          continue;
        }

        const reviews = data.Results || [];
        const products = data.Includes?.Products || {};
        console.log(`[BV-UK] Got ${reviews.length} reviews for ${cat.category}`);

        for (const review of reviews) {
          try {
            const productId = review.ProductId;
            const product = products[productId];
            const modelNumber = productId || `LG-${cat.category}-UK`;
            const displayName = product?.Name || review.ProductId || `LG ${cat.category}`;
            const reviewText = review.ReviewText || "";
            const title = review.Title || "";
            const rating = review.Rating || null;

            if (!reviewText || reviewText.length < 10) continue;

            // Dedup via external_id
            const externalId = `bv_uk_${review.Id}`;
            const { data: existing } = await supabase
              .from("reviews")
              .select("id")
              .eq("external_id", externalId)
              .maybeSingle();
            if (existing) continue;

            // Find or create product
            const { data: existingProd } = await supabase
              .from("products")
              .select("id")
              .eq("model_number", modelNumber)
              .maybeSingle();

            let dbProductId: string;
            if (existingProd) {
              dbProductId = existingProd.id;
            } else {
              const { data: newProd } = await supabase
                .from("products")
                .insert({
                  model_number: modelNumber,
                  display_name: displayName,
                  category: cat.category,
                })
                .select("id")
                .single();
              if (!newProd?.id) continue;
              dbProductId = newProd.id;
            }

            const { sentiment, score } = simpleSentiment(rating, reviewText);
            const issueTags = detectIssueTags(reviewText, cat.category);

            // Privacy masking — store sentiment summary, not raw text
            const maskedContent = `[LG.com UK 리뷰 — 감성: ${sentiment}, 점수: ${(score * 100).toFixed(0)}점${issueTags.length ? `, 이슈: ${issueTags.join(", ")}` : ""}] 개인정보 보호 정책에 따라 원문 텍스트는 표시되지 않습니다.`;

            await supabase.from("reviews").insert({
              product_id: dbProductId,
              source: "bazaarvoice_uk",
              source_url: `https://www.lg.com/uk/`,
              external_id: externalId,
              title: title.slice(0, 200) || null,
              content: maskedContent,
              author: "LG.com UK User",
              rating,
              sentiment,
              sentiment_score: score,
              published_at: review.SubmissionTime || null,
              emotion_category: sentiment === "positive" ? "satisfaction" : sentiment === "negative" ? "disappointment" : "neutral",
              emotion_intensity: rating ? Math.min(Math.max(rating, 1), 5) : 3,
              user_type: review.BadgesOrder?.includes("top") ? "power_user" : "actual_user",
              content_type: "review",
              platform_type: "retailer",
            });

            totalCollected++;
            categoryStats[cat.category]++;
          } catch (reviewErr) {
            console.error(`[BV-UK] Review save error:`, reviewErr);
            errors.push(`Review save: ${String(reviewErr).slice(0, 100)}`);
          }
        }
      } catch (catErr) {
        console.error(`[BV-UK] Category ${cat.category} error:`, catErr);
        errors.push(`${cat.category}: ${String(catErr).slice(0, 200)}`);
      }
    }

    if (logId) {
      await supabase.from("collection_logs").update({
        status: errors.length > 0 ? "partial" : "completed",
        items_collected: totalCollected,
        completed_at: new Date().toISOString(),
        error_message: errors.length ? errors.join("; ").slice(0, 1000) : null,
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        collected: totalCollected,
        errors: errors.length,
        error_details: errors.slice(0, 10),
        category_stats: categoryStats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[BV-UK] Fatal error:", err);
    if (logId) {
      await supabase.from("collection_logs").update({
        status: "failed",
        error_message: String(err).slice(0, 1000),
        completed_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
