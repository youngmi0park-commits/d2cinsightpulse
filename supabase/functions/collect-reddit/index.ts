import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ══════════════════════════════════════════════════════════════
//  REDDIT-FOCUSED SEARCH QUERIES — per category
// ══════════════════════════════════════════════════════════════

const REDDIT_QUERIES: Record<string, string[]> = {
  TV: [
    'site:reddit.com LG OLED (review OR "just bought" OR owner OR impression) 2025 OR 2026',
    'site:reddit.com "LG C5" OR "LG C4" OR "LG G5" OR "LG G6" review OR worth OR recommend',
    'site:reddit.com LG OLED (burn-in OR "picture quality" OR gaming OR "Dolby Vision")',
    'site:reddit.com LG OLED (disappointed OR issue OR problem OR "not working" OR defective)',
    'site:reddit.com "should I buy" LG OLED OR "LG TV" OR C5 OR G5 vs',
    'site:reddit.com LG QNED OR NanoCell review OR recommendation',
    'site:reddit.com LG OLED (calibration OR settings OR "best picture" OR tips)',
    'site:reddit.com "LG C6H" OR "LG W6" OR "OLED evo" 2026 review',
  ],
  Monitor: [
    'site:reddit.com LG UltraGear (review OR "just bought" OR impression OR gaming)',
    'site:reddit.com "27GR83Q" OR "32GS95UE" OR "27GP850" OR "LG monitor" review',
    'site:reddit.com LG monitor (flickering OR issue OR problem OR calibration)',
    'site:reddit.com "LG UltraWide" OR "LG UltraFine" review OR recommend',
  ],
  Laptop: [
    'site:reddit.com "LG Gram" (review OR "just bought" OR lightweight OR battery)',
    'site:reddit.com "LG Gram Pro" OR "Gram 17" OR "Gram 16" 2025 OR 2026 review',
    'site:reddit.com "LG Gram" (issue OR problem OR overheating OR keyboard)',
  ],
  Audio: [
    'site:reddit.com "LG Soundbar" (review OR "just bought" OR "Dolby Atmos" OR setup)',
    'site:reddit.com "S95TR" OR "S90TR" OR "S80QY" OR "XBOOM" review OR recommend',
    'site:reddit.com LG soundbar (issue OR problem OR "no sound" OR sync OR connectivity)',
  ],
  HomeAppliance: [
    'site:reddit.com LG WashTower OR "LG washer" OR "LG dryer" review OR recommend',
    'site:reddit.com LG InstaView OR "LG refrigerator" OR "LG fridge" review',
    'site:reddit.com LG CordZero OR "LG vacuum" OR "LG PuriCare" review',
    'site:reddit.com LG washer OR dryer (issue OR problem OR vibration OR noise OR error)',
  ],
  AirConditioner: [
    'site:reddit.com "LG AC" OR "LG air conditioner" OR "dual inverter" review OR recommend',
    'site:reddit.com LG AC (noise OR "energy saving" OR cooling OR installation OR issue)',
  ],
  StanbyME: [
    'site:reddit.com StanbyME OR "Stand by Me" LG review OR recommend OR worth',
  ],
};

// ══════════════════════════════════════════════════════════════
//  BUCKET CLASSIFICATION
// ══════════════════════════════════════════════════════════════

type Bucket = "review" | "voc" | "question";

function classifyBucket(text: string): Bucket {
  const t = text.toLowerCase();
  // VOC patterns
  const vocPatterns = [/disappointed|frustrated|terrible|defective|broken|refund|return/i, /not working|stopped|issue|problem|bug|error|crash/i, /regret|waste|do not buy|avoid|worst/i, /customer service|support ticket|repair/i];
  let vScore = 0;
  for (const p of vocPatterns) if (p.test(t)) vScore++;
  if (vScore >= 2) return "voc";

  // Question patterns
  const qPatterns = [/should\s+i|worth\s+(it|buying)|vs\.?|versus|compared?\s+to/i, /recommend|suggestion|advice|help/i, /how\s+(do|does|is|can|to|much)|what\s+(is|are|should)/i, /\?$/m];
  let qScore = 0;
  for (const p of qPatterns) if (p.test(t)) qScore++;
  if (qScore >= 2) return "question";

  if (vScore >= 1 && qScore === 0) return "voc";
  if (qScore >= 1) return "question";
  return "review";
}

// ══════════════════════════════════════════════════════════════
//  AI EXTRACTION PROMPT
// ══════════════════════════════════════════════════════════════

const REDDIT_EXTRACTION_PROMPT = `You are a Reddit data extractor for LG Electronics product intelligence. Extract individual posts/comments from the given Reddit content.

For each post/comment, return a JSON array of objects:
- model_number: string (LG model if found, else use category like "OLED TV General")
- display_name: string (full product name)
- category: string (TV, Monitor, Laptop, Audio, Washer, Dryer, Refrigerator, Air Conditioner, Robot Vacuum, StanbyME)
- title: string (post title or summary, max 200 chars)
- content: string (post/comment text, max 3000 chars, preserve original wording)
- author: string or null (Reddit username without u/)
- sentiment: "positive" | "negative" | "neutral" | "mixed"
- sentiment_score: number 0-1
- published_at: string ISO date or null
- subreddit: string (the subreddit name)
- post_type: "post" | "comment"
- upvotes: number or null
- is_lg_relevant: boolean (true only if specifically about LG product)

RULES:
- Only include content specifically about LG Electronics products
- Exclude generic mentions, memes, or off-topic content
- Preserve the original voice — do not paraphrase
- ALL text in English
- If content has both post and relevant comments, extract each separately
- Return ONLY valid JSON array, no markdown`;

// ══════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ══════════════════════════════════════════════════════════════

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
      JSON.stringify({ success: false, error: "Missing required env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Parse options
  let mode: "all" | "review" | "voc" | "question" = "all";
  let categoryFilter: string | null = null;
  let deepComments = true;
  let maxQueriesPerCategory = 8;

  try {
    const body = await req.json();
    if (body.mode) mode = body.mode;
    if (body.category) categoryFilter = body.category;
    if (body.deepComments !== undefined) deepComments = body.deepComments;
    if (body.maxQueries) maxQueriesPerCategory = Math.min(Number(body.maxQueries), 10);
  } catch {
    // defaults
  }

  // Log
  const { data: logEntry } = await supabase
    .from("collection_logs")
    .insert({ source: "reddit_collector_v2", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  let totalCollected = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  try {
    const categories = categoryFilter
      ? { [categoryFilter]: REDDIT_QUERIES[categoryFilter] || [] }
      : REDDIT_QUERIES;

    for (const [category, queries] of Object.entries(categories)) {
      const activeQueries = queries.slice(0, maxQueriesPerCategory);

      for (const query of activeQueries) {
        try {
          console.log(`[Reddit/${category}] Searching: ${query.slice(0, 80)}...`);

          // Firecrawl search
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
              scrapeOptions: { formats: ["markdown"] },
            }),
          });

          if (!searchRes.ok) {
            const errText = await searchRes.text();
            errors.push(`Search ${category}: ${searchRes.status} ${errText.slice(0, 100)}`);
            continue;
          }

          const searchData = await searchRes.json();
          const results = searchData.data || [];
          console.log(`[Reddit/${category}] Found ${results.length} results`);

          if (results.length === 0) continue;

          // Deep scrape for more content (comments)
          let batchedContent = "";
          for (const result of results) {
            let content = result.markdown || result.description || "";

            // If deep comments enabled and content is short, scrape the full page
            if (deepComments && content.length < 500 && result.url) {
              try {
                const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    url: result.url,
                    formats: ["markdown"],
                    onlyMainContent: true,
                  }),
                });
                if (scrapeRes.ok) {
                  const scrapeData = await scrapeRes.json();
                  content = scrapeData.data?.markdown || content;
                }
              } catch {
                // use original content
              }
            }

            if (content.length >= 50) {
              batchedContent += `\n\n--- Reddit Result (${result.url || "unknown"}) ---\n${content.slice(0, 4000)}`;
            }
          }

          if (batchedContent.length < 100) continue;

          // AI extraction
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: REDDIT_EXTRACTION_PROMPT },
                {
                  role: "user",
                  content: `Category: ${category}\n\nReddit Content:\n${batchedContent.slice(0, 15000)}`,
                },
              ],
              temperature: 0.1,
              max_tokens: 8000,
            }),
          });

          if (!aiRes.ok) {
            errors.push(`AI ${category}: ${aiRes.status}`);
            continue;
          }

          const aiData = await aiRes.json();
          const rawText = aiData.choices?.[0]?.message?.content || "[]";

          // Parse AI response
          let reviews: any[] = [];
          try {
            const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            reviews = JSON.parse(cleaned);
            if (!Array.isArray(reviews)) reviews = [];
          } catch {
            console.error(`Failed to parse AI response for ${category}`);
            continue;
          }

          // Filter by LG relevance & save
          for (const review of reviews) {
            if (!review.is_lg_relevant) continue;
            if (!review.content || review.content.length < 20) continue;

            // Bucket classification
            const bucket = classifyBucket(`${review.title || ""} ${review.content}`);

            // Mode filter
            if (mode !== "all" && bucket !== mode) continue;

            // Find or create product
            const productId = await findOrCreateProduct(
              supabase,
              review.model_number || category,
              review.display_name || `LG ${category}`,
              review.category || category,
            );

            // Deduplicate by content hash
            const contentHash = `reddit_${simpleHash(review.content.slice(0, 200))}`;
            const { data: existing } = await supabase
              .from("reviews")
              .select("id")
              .eq("external_id", contentHash)
              .maybeSingle();

            if (existing) {
              totalSkipped++;
              continue;
            }

            const { error: insertErr } = await supabase.from("reviews").insert({
              product_id: productId,
              source: `reddit_${(review.subreddit || category).toLowerCase()}`,
              external_id: contentHash,
              author: review.author || null,
              title: (review.title || "").slice(0, 500),
              content: review.content.slice(0, 5000),
              sentiment: review.sentiment || "neutral",
              sentiment_score: review.sentiment_score ?? 0.5,
              rating: null,
              published_at: review.published_at || null,
              source_url: null,
              review_type: "organic",
              content_type: bucket, // store bucket classification (review/voc/question)
              platform_type: "community",
              user_type: "actual_user",
            });

            if (insertErr) {
              errors.push(`Insert: ${insertErr.message}`);
            } else {
              totalCollected++;
            }
          }
        } catch (queryErr) {
          errors.push(`Query ${category}: ${queryErr}`);
        }
      }
    }
  } catch (fatalErr) {
    errors.push(`Fatal: ${fatalErr}`);
  }

  // Update log
  if (logId) {
    await supabase
      .from("collection_logs")
      .update({
        status: errors.length > 0 ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        items_collected: totalCollected,
        error_message: errors.length > 0 ? errors.slice(0, 10).join(" | ") : null,
      })
      .eq("id", logId);
  }

  const result = {
    success: true,
    collected: totalCollected,
    skipped_duplicates: totalSkipped,
    errors: errors.length,
    error_samples: errors.slice(0, 5),
    config: { mode, categoryFilter, deepComments, maxQueriesPerCategory },
  };

  console.log(`✅ Reddit collection complete:`, JSON.stringify(result));

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const productCache = new Map<string, string>();

async function findOrCreateProduct(
  supabase: any,
  modelNumber: string,
  displayName: string,
  category: string,
): Promise<string> {
  const safeModel = modelNumber.replace(/['"]/g, "").slice(0, 100);
  const cacheKey = `${safeModel}_${category}`;
  if (productCache.has(cacheKey)) return productCache.get(cacheKey)!;

  // Try match existing
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .or(`model_number.ilike.%${safeModel}%,display_name.ilike.%${safeModel}%`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    productCache.set(cacheKey, existing.id);
    return existing.id;
  }

  // Create generic Reddit product
  const genericModel = `Reddit_${category}_General`;
  const { data: genExisting } = await supabase
    .from("products")
    .select("id")
    .eq("model_number", genericModel)
    .maybeSingle();

  if (genExisting) {
    productCache.set(cacheKey, genExisting.id);
    return genExisting.id;
  }

  const { data: newProduct } = await supabase
    .from("products")
    .insert({
      model_number: genericModel,
      display_name: `LG ${category} (Reddit VOC)`,
      category,
      is_active: true,
    })
    .select("id")
    .single();

  const id = newProduct?.id || "unknown";
  productCache.set(cacheKey, id);
  return id;
}
