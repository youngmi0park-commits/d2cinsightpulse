import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Issue Tag 키워드 매핑 ──
const ISSUE_TAG_MAP: Record<string, { keywords: string[]; tag: string }[]> = {
  Refrigerator: [
    { keywords: ["linear compressor", "compressor"], tag: "Compressor_Issue" },
    { keywords: ["cooling", "not cooling", "warm", "temperature"], tag: "Cooling_Issue" },
    { keywords: ["class action", "lawsuit", "settlement"], tag: "Class_Action" },
    { keywords: ["food spoiled", "spoil", "rotten", "went bad"], tag: "Food_Spoilage" },
    { keywords: ["ice maker", "craft ice", "ice"], tag: "Ice_Maker_Issue" },
    { keywords: ["instaview", "door-in-door"], tag: "InstaView_Feature" },
  ],
  Washer: [
    { keywords: ["thinq", "thinq app", "smart diagnosis"], tag: "ThinQ_App_Issue" },
    { keywords: ["washtower", "wash tower"], tag: "WashTower" },
    { keywords: ["ai wash", "ai core"], tag: "AI_Wash_Feature" },
    { keywords: ["noise", "loud", "vibrat"], tag: "Noise_Issue" },
    { keywords: ["smart diagnosis"], tag: "Smart_Diagnosis" },
    { keywords: ["direct drive", "motor"], tag: "Direct_Drive" },
    { keywords: ["turbowash", "turbo wash"], tag: "TurboWash_Feature" },
    { keywords: ["steam", "allergen"], tag: "Steam_Cycle" },
  ],
  Dryer: [
    { keywords: ["heat pump"], tag: "HeatPump_Feature" },
    { keywords: ["lint", "vent"], tag: "Lint_Vent_Issue" },
    { keywords: ["noise", "loud", "vibrat"], tag: "Noise_Issue" },
  ],
};

// ── Search queries per category+region ──
const SEARCH_QUERIES: Record<string, Record<string, string[]>> = {
  Refrigerator: {
    us: [
      '"LG refrigerator" review verified purchase 2024 2025',
      'LG french door refrigerator owner review compressor',
      'LG InstaView refrigerator review ice maker',
    ],
    uk: [
      '"LG fridge" review UK owner experience 2024 2025',
      'LG american style fridge freezer review UK',
    ],
  },
  Washer: {
    us: [
      '"LG washer" review verified purchase 2024 2025',
      'LG WashTower review owner experience noise',
      'LG front load washer ThinQ review AI wash',
    ],
    uk: [
      '"LG washing machine" review UK owner 2024 2025',
      'LG washing machine review UK ThinQ',
    ],
  },
};

// ── AI Prompt ──
const REVIEW_EXTRACT_PROMPT = `You are an expert data scientist extracting LG Electronics product reviews.

From the page content, extract EVERY individual user review about LG products. For each review return:

{
  "model_number": "string (LG model if mentioned, or 'LG-CATEGORY-GENERIC')",
  "display_name": "string (product name)",
  "category": "string",
  "review_id": "string (unique)",
  "author": "string (anonymized, e.g. 'User_abc')",
  "rating": "number 1-5 or null",
  "date": "YYYY-MM-DD or null",
  "content": "string (full review text, max 1000 chars)",
  "verified_purchase": "boolean or null",
  "helpful_count": "number or null",
  "sentiment": "positive|negative|neutral|mixed",
  "sentiment_score": "number 0-1",
  "emotion_category": "string",
  "emotion_intensity": "number 1-5",
  "highlight_keywords": ["string array"],
  "issue_tags": ["string array from predefined set"],
  "marketing_point": "string or null",
  "pain_points": [{"type":"string","snippet":"string","severity":1}],
  "user_tips": ["string array"],
  "competitor_mentions": [{"brand":"string","direction":"+|-|neutral","snippet":"string"}],
  "source_region": "us|uk",
  "experience_duration": "string or null"
}

RULES:
- Only extract REAL user reviews, not editorial/expert content
- If no user reviews found, return []
- Prioritize reviews with specific details over generic praise
- Return ONLY valid JSON array, no markdown`;

// ── Bazaarvoice Conversations API ──
const BV_CONFIG: Record<string, { baseUrl: string; client: string }> = {
  us: { baseUrl: "https://api.bazaarvoice.com/data", client: "lg" },
  uk: { baseUrl: "https://api.bazaarvoice.com/data", client: "lg" },
};

async function fetchBazaarvoiceReviews(
  apiKey: string,
  region: "us" | "uk",
  category: string,
  offset = 0,
  limit = 20
): Promise<any[]> {
  const config = BV_CONFIG[region];
  const url = new URL(`${config.baseUrl}/reviews.json`);
  url.searchParams.set("apiversion", "5.4");
  url.searchParams.set("passkey", apiKey);
  url.searchParams.set("Include", "Products");
  url.searchParams.set("Sort", "SubmissionTime:desc");
  url.searchParams.set("Limit", String(limit));
  url.searchParams.set("Offset", String(offset));
  // Note: no date filter — BV returns latest reviews sorted by SubmissionTime desc

  const fullUrl = url.toString();
  console.log(`[BV-${region.toUpperCase()}] Request URL: ${fullUrl}`);
  const res = await fetch(fullUrl);
  const rawBody = await res.text();
  console.log(`[BV-${region.toUpperCase()}] Status: ${res.status}, Body (first 500): ${rawBody.slice(0, 500)}`);
  
  if (!res.ok) {
    throw new Error(`Bazaarvoice API error [${res.status}]: ${rawBody.slice(0, 500)}`);
  }

  const data = JSON.parse(rawBody);
  console.log(`[BV-${region.toUpperCase()}] TotalResults=${data.TotalResults}, returned=${data.Results?.length || 0}, HasErrors=${data.HasErrors}, Errors=${JSON.stringify(data.Errors || [])}`);
  return data.Results || [];
}

function mapBvReviewToInternal(bvReview: any, region: "us" | "uk"): any {
  const rating = bvReview.Rating || null;
  let sentiment = "neutral";
  let sentimentScore = 0.5;
  if (rating !== null) {
    if (rating >= 4) { sentiment = "positive"; sentimentScore = 0.7 + (rating - 4) * 0.15; }
    else if (rating <= 2) { sentiment = "negative"; sentimentScore = 0.1 + (rating - 1) * 0.15; }
    else { sentiment = "neutral"; sentimentScore = 0.5; }
  }

  return {
    model_number: bvReview.ProductId || `LG-${region.toUpperCase()}-GENERIC`,
    display_name: bvReview.Products?.[bvReview.ProductId]?.Name || `LG Product (${region.toUpperCase()})`,
    category: bvReview.Products?.[bvReview.ProductId]?.CategoryId || "General",
    review_id: bvReview.Id,
    author: null,
    rating,
    date: bvReview.SubmissionTime?.split("T")[0] || null,
    content: bvReview.ReviewText || "",
    title: bvReview.Title || null,
    sentiment,
    sentiment_score: sentimentScore,
    emotion_category: sentiment === "positive" ? "satisfaction" : sentiment === "negative" ? "frustration" : "neutral",
    emotion_intensity: rating ? Math.min(5, Math.max(1, rating)) : 3,
    source_region: region,
    issue_tags: [],
    verified_purchase: bvReview.BadgesOrder?.includes("verifiedPurchaser") || false,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const BAZAARVOICE_UK_API_KEY = Deno.env.get("BAZAARVOICE_UK_API_KEY");
  const BAZAARVOICE_US_API_KEY = Deno.env.get("BAZAARVOICE_US_API_KEY");

  if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing required environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let categories = ["Refrigerator", "Washer"];
  let regions: ("us" | "uk")[] = ["us", "uk"];
  let maxQueriesPerCategory = 2;

  try {
    const body = await req.json();
    if (body.categories?.length) categories = body.categories;
    if (body.regions?.length) regions = body.regions;
    if (body.maxQueries) maxQueriesPerCategory = body.maxQueries;
  } catch {
    // defaults
  }

  const { data: logEntry } = await supabase
    .from("collection_logs")
    .insert({ source: "lge_reviews", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  let totalCollected = 0;
  const errors: string[] = [];
  const regionStats: Record<string, { us: number; uk: number }> = {};

  try {
    for (const category of categories) {
      regionStats[category] = { us: 0, uk: 0 };

      for (const region of regions) {
        console.log(`\n=== [${region.toUpperCase()}] ${category} ===`);

        // ── Try Bazaarvoice API first for both regions ──
        const bvApiKey = region === "uk" ? BAZAARVOICE_UK_API_KEY : BAZAARVOICE_US_API_KEY;
        
        if (bvApiKey) {
          console.log(`[${region.toUpperCase()}] Using Bazaarvoice Conversations API (${region === "uk" ? "Staging" : "Production"})`);
          try {
            const bvReviews = await fetchBazaarvoiceReviews(bvApiKey, region, category, 0, 50);
            console.log(`[BV-${region.toUpperCase()}] Got ${bvReviews.length} reviews for ${category}`);

            for (const bvReview of bvReviews) {
              const review = mapBvReviewToInternal(bvReview, region);
              if (!review.content || review.content.length < 20) continue;

              const issueTags = detectIssueTags(review.content, category);
              review.issue_tags = [...new Set([...review.issue_tags, ...issueTags])];

              const bvClient = BV_CONFIG[region].client;
              const saved = await saveReview(supabase, review, category, `bazaarvoice://${bvClient}/${bvReview.Id}`);
              if (saved) {
                totalCollected++;
                regionStats[category][region]++;
              }
            }
            continue; // Skip Firecrawl if BV succeeded
          } catch (bvErr) {
            console.error(`[BV-${region.toUpperCase()}] Error:`, bvErr);
            errors.push(`Bazaarvoice ${region.toUpperCase()} error: ${bvErr}`);
            console.log(`[${region.toUpperCase()}] Falling back to Firecrawl search`);
          }
        }

        // ── Fallback: Firecrawl ──
        const collected = await collectViaFirecrawl(supabase, FIRECRAWL_API_KEY, LOVABLE_API_KEY, category, region, maxQueriesPerCategory, regionStats, errors);
        totalCollected += collected;
      }
    }

    // Region comparison
    const regionComparison = await generateRegionComparison(supabase, LOVABLE_API_KEY, categories, regionStats);

    if (logId) {
      await supabase.from("collection_logs").update({
        status: errors.length > 0 ? "partial" : "completed",
        items_collected: totalCollected,
        completed_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        collected: totalCollected,
        errors: errors.length,
        error_details: errors.slice(0, 5),
        region_stats: regionStats,
        region_comparison: regionComparison,
        bazaarvoice_us: !!BAZAARVOICE_US_API_KEY,
        bazaarvoice_uk: !!BAZAARVOICE_UK_API_KEY,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Fatal error:", err);
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

// ── Firecrawl-based collection (US + fallback) ──
async function collectViaFirecrawl(
  supabase: any, firecrawlKey: string, lovableKey: string,
  category: string, region: string, maxQueries: number,
  regionStats: Record<string, { us: number; uk: number }>, errors: string[]
): Promise<number> {
  let collected = 0;
  const queries = (SEARCH_QUERIES[category]?.[region] || []).slice(0, maxQueries);
  if (queries.length === 0) {
    errors.push(`No queries for ${category}/${region}`);
    return 0;
  }

  for (const query of queries) {
    try {
      console.log(`[${region.toUpperCase()}] Searching: ${query}`);

      const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit: 5 }),
      });

      if (!searchRes.ok) {
        errors.push(`Search failed: ${searchRes.status}`);
        continue;
      }

      const searchData = await searchRes.json();
      const results = searchData.data || [];
      console.log(`[${region.toUpperCase()}] Got ${results.length} search results`);

      if (results.length === 0) continue;

      const snippetsText = results.map((r: any, i: number) =>
        `[Result ${i+1}] URL: ${r.url}\nTitle: ${r.title || ""}\nSnippet: ${r.description || ""}`
      ).join("\n\n");

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: REVIEW_EXTRACT_PROMPT },
            {
              role: "user",
              content: `Category: ${category}\nRegion: ${region}\nSearch Query: ${query}\n\nSearch Results with Review Snippets:\n${snippetsText}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 8000,
        }),
      });

      if (!aiRes.ok) {
        errors.push(`AI failed: ${aiRes.status}`);
        continue;
      }

      const aiData = await aiRes.json();
      const rawText = aiData.choices?.[0]?.message?.content || "[]";
      const reviews = parseAiReviews(rawText);
      console.log(`[${region.toUpperCase()}] Extracted ${reviews.length} reviews`);

      for (const review of reviews) {
        const issueTags = detectIssueTags(review.content || "", category);
        const allIssueTags = [...new Set([...(review.issue_tags || []), ...issueTags])];
        const sourceUrl = results[0]?.url || query;

        const saved = await saveReview(supabase, {
          ...review,
          issue_tags: allIssueTags,
          source_region: region,
        }, category, sourceUrl);

        if (saved) {
          collected++;
          regionStats[category][region as "us" | "uk"]++;
        }
      }
    } catch (queryErr) {
      console.error(`Error with query "${query}":`, queryErr);
      errors.push(`Query error: ${queryErr}`);
    }
  }
  return collected;
}

// ── Issue tag detection ──
function detectIssueTags(content: string, category: string): string[] {
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();
  const categoryTags = ISSUE_TAG_MAP[category] || [];
  for (const { keywords, tag } of categoryTags) {
    if (keywords.some(kw => lowerContent.includes(kw.toLowerCase()))) {
      tags.push(tag);
    }
  }
  return tags;
}

// ── Parse AI response ──
function parseAiReviews(rawText: string): any[] {
  try {
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Failed to parse AI reviews:", rawText.slice(0, 300));
    return [];
  }
}

// ── Save review to DB ──
async function saveReview(
  supabase: any, review: any, category: string, sourceUrl: string
): Promise<boolean> {
  if (!review.content || review.content.length < 20) return false;

  const modelNum = review.model_number || `LG-${category}-GENERIC`;

  const { data: existing } = await supabase
    .from("products").select("id").eq("model_number", modelNum).maybeSingle();

  let productId: string;
  if (existing) {
    productId = existing.id;
  } else {
    const { data: newProd } = await supabase
      .from("products")
      .insert({
        model_number: modelNum,
        display_name: review.display_name || `LG ${category}`,
        category: review.category || category,
      })
      .select("id").single();
    productId = newProd?.id;
  }
  if (!productId) return false;

  // Dedup
  const hashInput = review.content.slice(0, 100);
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
    hash |= 0;
  }
  const externalId = `lge_${review.source_region || "us"}-${Math.abs(hash).toString(36)}-${review.content.length}`;

  const { data: existingReview } = await supabase
    .from("reviews").select("id").eq("external_id", externalId).maybeSingle();
  if (existingReview) return false;

  // Privacy masking for LG.com reviews
  const issueTags = (review.issue_tags || []).join(", ");
  const maskedContent = `[LG 리뷰 — 감성: ${review.sentiment || "neutral"}, 점수: ${((review.sentiment_score ?? 0.5) * 100).toFixed(0)}점${issueTags ? `, 이슈: ${issueTags}` : ""}] 개인정보 보호 정책에 따라 원문 텍스트는 표시되지 않습니다.`;

  await supabase.from("reviews").insert({
    product_id: productId,
    source: `lge_com_${review.source_region || "us"}`,
    source_url: sourceUrl,
    external_id: externalId,
    title: review.marketing_point?.slice(0, 200) || review.highlight_keywords?.join(", ")?.slice(0, 200) || null,
    content: maskedContent,
    author: "LG Review User",
    rating: review.rating || null,
    sentiment: review.sentiment || "neutral",
    sentiment_score: review.sentiment_score ?? 0.5,
    published_at: review.date || null,
    emotion_category: review.emotion_category || "neutral",
    emotion_intensity: review.emotion_intensity || 3,
    user_type: review.verified_purchase ? "actual_user" : "unknown",
    content_type: "review",
    platform_type: "retailer",
  });

  return true;
}

// ── Region comparison ──
async function generateRegionComparison(
  supabase: any, lovableApiKey: string, categories: string[], regionStats: Record<string, { us: number; uk: number }>
): Promise<any> {
  try {
    const { data: usReviews } = await supabase
      .from("reviews")
      .select("content, sentiment, sentiment_score, emotion_category, title")
      .eq("source", "lge_com_us")
      .order("collected_at", { ascending: false })
      .limit(50);

    const { data: ukReviews } = await supabase
      .from("reviews")
      .select("content, sentiment, sentiment_score, emotion_category, title")
      .eq("source", "lge_com_uk")
      .order("collected_at", { ascending: false })
      .limit(50);

    if (!usReviews?.length && !ukReviews?.length) {
      return { message: "Not enough data for comparison yet" };
    }

    const usSummary = (usReviews || []).map((r: any) => `[${r.sentiment}/${r.emotion_category}] ${r.title || ""}`).join("\n");
    const ukSummary = (ukReviews || []).map((r: any) => `[${r.sentiment}/${r.emotion_category}] ${r.title || ""}`).join("\n");

    const usAvg = usReviews?.length
      ? (usReviews.reduce((s: number, r: any) => s + (r.sentiment_score || 0.5), 0) / usReviews.length * 100).toFixed(0) : "N/A";
    const ukAvg = ukReviews?.length
      ? (ukReviews.reduce((s: number, r: any) => s + (r.sentiment_score || 0.5), 0) / ukReviews.length * 100).toFixed(0) : "N/A";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Compare US vs UK LG customer sentiment. Return JSON:
{"us_vs_uk_sentiment":"string","us_avg_score":number,"uk_avg_score":number,"common_praise":[],"common_complaints":[],"us_unique_insights":[],"uk_unique_insights":[],"marketing_recommendations":[]}
Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: `Categories: ${categories.join(", ")}\nStats: ${JSON.stringify(regionStats)}\n\nUS (avg:${usAvg}):\n${usSummary.slice(0, 2000)}\n\nUK (avg:${ukAvg}):\n${ukSummary.slice(0, 2000)}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content || "{}";
      try {
        return JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      } catch {
        return { raw };
      }
    }
    return { message: "Region comparison failed" };
  } catch (err) {
    console.error("Region comparison error:", err);
    return { error: String(err) };
  }
}
