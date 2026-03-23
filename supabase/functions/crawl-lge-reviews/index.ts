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

// ── LG.com 카테고리별 URL 패턴 ──
const LGE_CATEGORY_PATHS: Record<string, { us: string; uk: string }> = {
  Refrigerator: {
    us: "https://www.lge.com/us/refrigerators",
    uk: "https://www.lge.com/uk/refrigerators",
  },
  Washer: {
    us: "https://www.lge.com/us/washers",
    uk: "https://www.lge.com/uk/washing-machines",
  },
  Dryer: {
    us: "https://www.lge.com/us/dryers",
    uk: "https://www.lge.com/uk/dryers",
  },
};

// ── AI Prompt for LGE review extraction ──
const LGE_REVIEW_PROMPT = `You are an expert data scientist analyzing LG Electronics product reviews from the official LG.com website.

Extract EVERY individual user review from the page content. For each review, return a JSON object:

## Required Fields
- model_number: string (LG model number from the page URL or content, e.g. "LRFXS2503S", "WM4000HWA")
- display_name: string (full product name)
- category: string (Refrigerator, Washer, Dryer, etc.)
- review_id: string (unique identifier from the page, or generate from author+date)
- author: string (reviewer name/ID — anonymize if real name detected, use initials or "LG.com User")
- rating: number 1-5
- date: string (YYYY-MM-DD format)
- content: string (full review text, max 1000 chars)
- verified_purchase: boolean or null
- helpful_count: number or null

## Analysis Fields
- sentiment: "positive" | "negative" | "neutral" | "mixed"
- sentiment_score: number 0-1 (0=very negative, 1=very positive)
- emotion_category: string (satisfaction, recommendation, impressed, complaint, anger, disappointment, mixed, neutral)
- emotion_intensity: number 1-5

## Issue & Insight Fields
- highlight_keywords: string[] (key feature/issue terms found in review)
- issue_tags: string[] (from predefined set: Compressor_Issue, Cooling_Issue, Class_Action, Food_Spoilage, Ice_Maker_Issue, ThinQ_App_Issue, WashTower, AI_Wash_Feature, Noise_Issue, Smart_Diagnosis, Direct_Drive, TurboWash_Feature, Steam_Cycle, HeatPump_Feature)
- marketing_point: string (one-sentence marketing-ready strength summary if positive, null if negative)
- pain_points: array of { type: string, snippet: string, severity: 1-5 }
- user_tips: string[] (any setup tips, workarounds, or solutions shared by the reviewer)
- competitor_mentions: array of { brand: string, direction: "+"|"-"|"neutral", snippet: string }

## Contextual Fields
- source_region: string ("us" or "uk" — infer from URL or language/spelling cues)
- experience_duration: string or null (how long they've owned the product, e.g. "6 months", "2 years")

RULES:
- Extract ALL individual reviews, not summaries
- Preserve specific user experiences and quantitative details (temperatures, dB levels, dimensions)
- Mark verified purchases when indicated
- Detect issue_tags by checking review text against known issue keywords
- For LG.com reviews: anonymize author names (use "LG.com User" + last 3 chars of original)
- Return ONLY valid JSON array, no markdown wrapping`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing required environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Parse request body
  let categories = ["Refrigerator", "Washer"];
  let regions: ("us" | "uk")[] = ["us", "uk"];
  let maxPagesPerCategory = 5;

  try {
    const body = await req.json();
    if (body.categories?.length) categories = body.categories;
    if (body.regions?.length) regions = body.regions;
    if (body.maxPages) maxPagesPerCategory = body.maxPages;
  } catch {
    // Use defaults
  }

  // Create collection log
  const { data: logEntry } = await supabase
    .from("collection_logs")
    .insert({ source: "lge_com_direct", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  let totalCollected = 0;
  const errors: string[] = [];
  const regionStats: Record<string, { us: number; uk: number }> = {};

  try {
    for (const category of categories) {
      const paths = LGE_CATEGORY_PATHS[category];
      if (!paths) {
        errors.push(`Unknown category: ${category}`);
        continue;
      }

      regionStats[category] = { us: 0, uk: 0 };

      for (const region of regions) {
        const baseUrl = paths[region];
        console.log(`\n=== [${region.toUpperCase()}] ${category} — Mapping: ${baseUrl} ===`);

        // Step 1: Map the category page to discover product URLs
        let productUrls: string[] = [];
        try {
          const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: baseUrl,
              limit: 100,
              includeSubdomains: false,
            }),
          });

          if (mapRes.ok) {
            const mapData = await mapRes.json();
            const allLinks = mapData.links || mapData.data?.links || [];
            // Filter to product detail pages (PDPs) — they typically have model slugs
            productUrls = allLinks
              .filter((link: string) => {
                const lowerLink = link.toLowerCase();
                // Must be under the category path and look like a PDP
                const categorySlug = region === "us" 
                  ? (category === "Refrigerator" ? "/us/refrigerators/" : category === "Washer" ? "/us/washers/" : "/us/dryers/")
                  : (category === "Refrigerator" ? "/uk/refrigerators/" : category === "Washer" ? "/uk/washing-machines/" : "/uk/dryers/");
                return lowerLink.includes(categorySlug) && 
                       !lowerLink.includes("/compare") &&
                       !lowerLink.includes("/accessories") &&
                       !lowerLink.includes("/filter") &&
                       link !== baseUrl &&
                       // Must have a model slug (usually has dashes and alphanumeric chars)
                       link.split("/").length > 5;
              })
              .slice(0, maxPagesPerCategory);
            
            console.log(`[${region.toUpperCase()}] Found ${productUrls.length} product pages for ${category}`);
          } else {
            console.error(`Map failed for ${baseUrl}: ${mapRes.status}`);
            // Fallback: use search
            productUrls = await searchForProductPages(FIRECRAWL_API_KEY, category, region, maxPagesPerCategory);
          }
        } catch (mapErr) {
          console.error(`Map error for ${baseUrl}:`, mapErr);
          productUrls = await searchForProductPages(FIRECRAWL_API_KEY, category, region, maxPagesPerCategory);
        }

        if (productUrls.length === 0) {
          console.log(`[${region.toUpperCase()}] No product URLs found for ${category}, trying search fallback`);
          productUrls = await searchForProductPages(FIRECRAWL_API_KEY, category, region, maxPagesPerCategory);
        }

        // Step 2: Scrape each product page for reviews
        for (const url of productUrls) {
          try {
            console.log(`[${region.toUpperCase()}] Scraping reviews: ${url}`);

            const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url,
                formats: ["markdown"],
                onlyMainContent: false, // Need full page to get review section
                waitFor: 3000, // Wait for JS-rendered reviews
              }),
            });

            if (!scrapeRes.ok) {
              const errText = await scrapeRes.text();
              console.error(`Scrape failed for ${url}: ${scrapeRes.status} ${errText.slice(0, 200)}`);
              errors.push(`Scrape ${url}: ${scrapeRes.status}`);
              continue;
            }

            const scrapeData = await scrapeRes.json();
            const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

            if (markdown.length < 200) {
              console.log(`[${region.toUpperCase()}] Page too short, skipping: ${url}`);
              continue;
            }

            // Step 3: AI extraction of reviews
            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: LGE_REVIEW_PROMPT },
                  {
                    role: "user",
                    content: `Source: LG.com ${region.toUpperCase()}\nURL: ${url}\nCategory: ${category}\nRegion: ${region}\n\nPage Content:\n${markdown.slice(0, 15000)}`,
                  },
                ],
                temperature: 0.1,
                max_tokens: 8000,
              }),
            });

            if (!aiRes.ok) {
              console.error(`AI extraction failed for ${url}`);
              errors.push(`AI failed: ${url}`);
              continue;
            }

            const aiData = await aiRes.json();
            const rawText = aiData.choices?.[0]?.message?.content || "[]";
            const reviews = parseAiReviews(rawText);

            console.log(`[${region.toUpperCase()}] Extracted ${reviews.length} reviews from ${url}`);

            // Step 4: Save reviews with issue tags
            for (const review of reviews) {
              // Apply issue tag detection
              const issueTags = detectIssueTags(review.content || "", category);
              const allIssueTags = [...new Set([...(review.issue_tags || []), ...issueTags])];

              const saved = await saveReview(supabase, {
                ...review,
                issue_tags: allIssueTags,
                source_region: region,
              }, category, url);

              if (saved) {
                totalCollected++;
                regionStats[category][region]++;
              }
            }
          } catch (pageErr) {
            console.error(`Error processing ${url}:`, pageErr);
            errors.push(`${url}: ${pageErr}`);
          }
        }
      }
    }

    // Step 5: Generate region comparison analysis
    const regionComparison = await generateRegionComparison(
      supabase, LOVABLE_API_KEY, categories, regionStats
    );

    // Update collection log
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
        region_stats: regionStats,
        region_comparison: regionComparison,
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

// ── Fallback: search for product pages ──
async function searchForProductPages(
  apiKey: string, category: string, region: string, limit: number
): Promise<string[]> {
  try {
    const domain = region === "us" ? "lge.com/us" : "lge.com/uk";
    const query = `site:${domain} LG ${category.toLowerCase()} reviews`;

    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.data || [])
      .filter((r: any) => r.url && r.url.includes(domain))
      .map((r: any) => r.url)
      .slice(0, limit);
  } catch {
    return [];
  }
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
    return Array.isArray(JSON.parse(cleaned)) ? JSON.parse(cleaned) : [];
  } catch {
    console.error("Failed to parse AI review response");
    return [];
  }
}

// ── Save review to DB ──
async function saveReview(
  supabase: any, review: any, category: string, sourceUrl: string
): Promise<boolean> {
  if (!review.content || review.content.length < 20) return false;

  const modelNum = review.model_number || `LG-${category}-GENERIC`;

  // Find or create product
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

  // Dedup check
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

  // Masking for LG.com reviews (privacy policy)
  const issueTags = (review.issue_tags || []).join(", ");
  const maskedContent = `[LG.com 리뷰 — 감성: ${review.sentiment || "neutral"}, 점수: ${((review.sentiment_score ?? 0.5) * 100).toFixed(0)}점${issueTags ? `, 이슈: ${issueTags}` : ""}] 개인정보 보호 정책에 따라 원문 텍스트는 표시되지 않습니다.`;

  await supabase.from("reviews").insert({
    product_id: productId,
    source: `lge_com_${review.source_region || "us"}`,
    source_url: sourceUrl,
    external_id: externalId,
    title: review.marketing_point?.slice(0, 200) || review.highlight_keywords?.join(", ")?.slice(0, 200) || null,
    content: maskedContent,
    author: "LG.com User",
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

// ── Region comparison analysis ──
async function generateRegionComparison(
  supabase: any, lovableApiKey: string, categories: string[], regionStats: Record<string, { us: number; uk: number }>
): Promise<any> {
  try {
    // Fetch recent LGE reviews for comparison
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

    if ((!usReviews?.length && !ukReviews?.length)) {
      return { message: "Not enough data for comparison yet" };
    }

    const usSummary = (usReviews || []).map((r: any) => `[${r.sentiment}/${r.emotion_category}] ${r.title || ""}`).join("\n");
    const ukSummary = (ukReviews || []).map((r: any) => `[${r.sentiment}/${r.emotion_category}] ${r.title || ""}`).join("\n");

    const usAvgScore = usReviews?.length
      ? (usReviews.reduce((s: number, r: any) => s + (r.sentiment_score || 0.5), 0) / usReviews.length * 100).toFixed(0)
      : "N/A";
    const ukAvgScore = ukReviews?.length
      ? (ukReviews.reduce((s: number, r: any) => s + (r.sentiment_score || 0.5), 0) / ukReviews.length * 100).toFixed(0)
      : "N/A";

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
            content: `You are a global brand strategist for LG Electronics. Compare US and UK customer sentiment for the given product categories. Return JSON:
{
  "us_vs_uk_sentiment": "string — one paragraph comparing satisfaction levels",
  "us_avg_score": number,
  "uk_avg_score": number,
  "common_praise": ["string array of shared positive themes"],
  "common_complaints": ["string array of shared negative themes"],
  "us_unique_insights": ["insights unique to US market"],
  "uk_unique_insights": ["insights unique to UK market"],
  "marketing_recommendations": ["actionable marketing recommendations based on regional differences"]
}
Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: `Categories: ${categories.join(", ")}
Collection stats: ${JSON.stringify(regionStats)}

US Reviews (avg score: ${usAvgScore}):
${usSummary.slice(0, 3000)}

UK Reviews (avg score: ${ukAvgScore}):
${ukSummary.slice(0, 3000)}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const rawText = aiData.choices?.[0]?.message?.content || "{}";
      try {
        const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
      } catch {
        return { raw: rawText };
      }
    }

    return { message: "Region comparison AI call failed" };
  } catch (err) {
    console.error("Region comparison error:", err);
    return { error: String(err) };
  }
}
