import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Channel definitions with Firecrawl search queries
const CHANNELS = [
  { id: "reddit", label: "Reddit", queryTemplate: (product: string) => `site:reddit.com LG ${product} review OR r/LG_UserHub ${product}` },
  { id: "reddit_ac", label: "Reddit AC", queryTemplate: (product: string) => `site:reddit.com "LG AC" ${product} OR "LG air conditioner" ${product} OR "dual inverter" ${product}` },
  { id: "amazon", label: "Amazon", queryTemplate: (product: string) => `site:amazon.com LG ${product} review` },
  { id: "rtings", label: "RTINGS", queryTemplate: (product: string) => `site:rtings.com LG ${product}` },
  { id: "trusted_reviews", label: "Trusted Reviews", queryTemplate: (product: string) => `site:trustedreviews.com LG ${product}` },
  { id: "consumer_reports", label: "Consumer Reports", queryTemplate: (product: string) => `site:consumerreports.org LG ${product}` },
  { id: "cnet", label: "CNET", queryTemplate: (product: string) => `site:cnet.com LG ${product} review` },
  { id: "trustpilot", label: "Trustpilot", queryTemplate: (product: string) => `site:trustpilot.com LG ${product}` },
  { id: "bestreviews", label: "BestReviews", queryTemplate: (product: string) => `site:bestreviews.com LG ${product}` },
  { id: "youtube", label: "YouTube", queryTemplate: (product: string) => `site:youtube.com LG ${product} review` },
  { id: "lemon8", label: "Lemon8", queryTemplate: (product: string) => `site:lemon8-app.com LG ${product}` },
];

const LG_CATEGORIES = ["TV", "Monitor", "Refrigerator", "Washer", "Dryer", "Air Conditioner", "Soundbar", "Laptop", "Projector", "Robot Vacuum", "StanbyME"];

// ──────────────────────────────────────────────────────────────────
// EXPANDED KEYWORD TAXONOMY (all English-based)
// ──────────────────────────────────────────────────────────────────

// 1️⃣ Product Name · Model Name (official + abbreviations + shorthand)
const PRODUCT_NAME_KEYWORDS = [
  // TV
  "LG OLED", "OLED C4", "OLED C5", "OLED G4", "OLED G5", "C4", "C5", "G4", "G5",
  "OLED65C4PUA", "OLED55C4", "QNED", "NanoCell", "UR9000",
  // Monitor
  "UltraGear", "UltraFine", "UltraWide", "27GP850", "27GL83A", "32GQ950",
  // Laptop
  "LG Gram", "Gram 16", "Gram16", "G16", "Gram 17", "Gram17", "Gram Pro",
  // Home Appliances
  "WashTower", "LashTower", "InstaView", "ThinQ", "CordZero", "PuriCare",
  "StanbyME", "StandbyMe", "Stand by Me", "XBOOM",
  // Air Conditioner
  "Dual Inverter", "DualInverter", "Dual Cool", "DualCool", "ArtCool",
  "LW1522IVSM", "LW1822IVSM", "LW2422IVSM", "LP1421BSST",
  "LG Window AC", "LG Split AC", "LG Portable AC",
];

// 2️⃣ Feature · Spec Keywords
const FEATURE_SPEC_KEYWORDS = [
  "battery", "battery life", "heat", "heating", "overheating", "thermal",
  "performance", "speed", "processing", "lag", "latency",
  "picture quality", "image quality", "color accuracy", "brightness", "dimming",
  "weight", "lightweight", "portability", "build quality",
  "update", "firmware", "software update", "bug", "error", "crash",
  "slow", "stuttering", "buffering", "freezing", "glitch",
  "noise", "fan noise", "compressor noise", "vibration",
  "energy efficiency", "power consumption", "standby power",
  "connectivity", "WiFi", "Bluetooth", "HDMI", "USB-C",
  "HDR", "Dolby Vision", "Dolby Atmos", "G-Sync", "FreeSync", "VRR",
  "refresh rate", "144Hz", "120Hz", "response time", "input lag",
  "burn-in", "retention", "panel uniformity", "backlight bleed",
  "smart features", "webOS", "voice control", "magic remote",
  // Air Conditioner — Performance & Technology
  "dual inverter compressor", "AI core tech", "energy saving", "smart diagnosis",
  "cooling speed", "rapid cooling", "fast cooling", "instant cool",
  "low noise", "silent operation", "sleep mode", "quiet mode",
  "auto cleaning", "self-cleaning", "anti-bacterial", "allergen filter",
  "dehumidification", "humidity control", "air purification",
  "smart ThinQ", "WiFi control", "voice assistant", "remote control app",
  "energy star", "SEER rating", "EER rating", "annual energy cost",
  "BTU", "tonnage", "coverage area", "room size",
  "installation", "easy install", "window kit", "portable",
  "gold fin", "ocean black fin", "corrosion resistant",
  "4-way swing", "monsoon comfort", "stabilizer free", "tropicalized",
  "R32 refrigerant", "R410A", "eco-friendly refrigerant",
  "compressor warranty", "10 year warranty",
];

// 3️⃣ Sentiment · Attitude Keywords
const SENTIMENT_KEYWORDS = {
  positive: [
    "recommend", "satisfied", "good", "great", "excellent", "love",
    "impressive", "stunning", "amazing", "fantastic", "perfect",
    "reliable", "durable", "premium", "worth it", "must-have",
  ],
  negative: [
    "disappointed", "frustrated", "bad", "worst", "terrible", "awful",
    "refund", "return", "regret", "waste", "overpriced", "defective",
    "poor quality", "not worth", "do not buy", "avoid",
  ],
  mixed: [
    "expensive but good", "pricey but worth it", "good but overpriced",
    "great except for", "love it but", "nice but",
  ],
};

// 4️⃣ Comparison · Alternative Keywords
const COMPARISON_KEYWORDS = [
  "better than", "worse than", "compared to", "versus", "vs",
  "switched from", "switched to", "replaced with", "alternative to",
  "instead of", "upgrade from", "downgrade", "do not recommend",
  "Samsung vs LG", "Sony vs LG", "TCL vs LG",
];

// 5️⃣ Problem · Desire Keywords
const PROBLEM_DESIRE_KEYWORDS = [
  "wish it had", "would be nice if", "needs improvement",
  "when is the update", "fix this", "please add",
  "bug", "inconvenient", "could be better", "should improve",
  "missing feature", "deal breaker", "frustrating",
];

// Combine all for search query enrichment
const EXPANDED_SEARCH_TERMS = [
  ...PRODUCT_NAME_KEYWORDS,
  ...FEATURE_SPEC_KEYWORDS,
  ...SENTIMENT_KEYWORDS.positive,
  ...SENTIMENT_KEYWORDS.negative,
  ...COMPARISON_KEYWORDS.slice(0, 10),
  ...PROBLEM_DESIRE_KEYWORDS.slice(0, 8),
];

// lge.com top inbound search keywords (dotcom top 100)
const DOTCOM_KEYWORDS = [
  "oled", "lg gram", "ultragear", "thinq", "ai core tech", "4k", "hdr", "g-sync compatible", "thin and light", "burn-in",
  "c4", "g4", "c3", "cx", "nano ips", "144hz", "1ms", "dolby vision", "lodb", "smart tv",
  "refrigerator", "washing machine", "dryer", "french door", "inverter", "core ultra", "lg glance", "portable", "1440p", "freesync",
  "uniformity", "green tint", "backlight bleed", "17z90tp", "hybrid ai", "time travel", "dolby atmos", "sleek", "21:9", "curved",
  "gp850", "gl850", "27gl83a", "dishwasher", "energy-efficient", "life's good", "nanocell", "qhd", "overclock", "displayport",
  "deep wash", "commercial washer", "drum machine", "lg partner store", "consumer reports", "jd power", "ces 2026", "ryu jae-chul", "b2b", "builder market",
  "alpha 9 processor", "evo panel", "brightness booster", "magic remote", "webos", "game dashboard", "input lag", "vrr", "allm", "hdmi 2.1",
  "style edition", "aerominum", "magnesium alloy", "number pad", "trackpad responsiveness", "arc graphics", "multi-tasking", "future proof", "anti-glare", "nits",
  "instaview", "door-in-door", "craft ice", "linear compressor", "direct drive motor", "turbowash", "steam cycle", "heat pump dryer", "quadwash", "truesteam",
  "keyword strategy", "seo", "organic traffic", "ppc bidding", "long-tail keywords", "influencer collaboration", "customer satisfaction", "brand reputation", "crisis management", "social listening",
  "tv", "lg oled g5", "lg oled c4", "lg oled c5", "lg oled g4",
  "lg smart tv 32", "qned", "lg oled g4 65", "lg oled c4 65", "tv oled",
  "tv 50 polegadas", "tv 65 polegadas", "smart tv 43 polegadas",
  "tv 55", "tv 65", "lg 43 inch tv 2025 model", "oled g5", "oled c4", "oled c5", "c5", "g5",
  "lg magic remote", "lg smart tv magic remote", "remote", "controle remoto smart tv",
  "monitor", "smart monitor", "stand by me", "stand by me 2",
  "soundbar", "xboom", "barra de sonido",
  "lava e seca", "lava e seca vc2 14kg", "lavadora", "lavasecadora", "lava e seca vc4 12kg",
  "secadora", "lavadoras", "lg 8kg top load washing machine", "washer dryer", "lashtower",
  "lavadora secadora", "washing machine top load", "lg 9kg front load washing machine",
  "lg washing machine 7 kg semi autom", "vc2",
  "refrigerador", "fridge", "freezer", "refrigerador 22 pies", "refrigerador 14 pies",
  "microwave", "microondas", "lavavajillas",
  "air conditioner", "ar condicionado dual inverter 12000", "ar condicionado dual inverter 9000",
  "ar condicionado", "ar condicionado portatil", "split type inverter aircon",
  "lg 1 5 star dual inverter split ac 20", "ar condicionado 127v", "aire acondicionado",
  "window type inverter", "ar condicionado dual inverter 18000", "air purifier",
  "aire acondicionado inverter",
  // AC marketing & performance keywords
  "dual inverter ac", "LG AC dual inverter", "LG air conditioner review",
  "LG AC energy saving", "LG AC smart diagnosis", "LG AI air conditioner",
  "LG window AC quiet", "LG portable AC", "LG split AC inverter",
  "LG AC vs Samsung AC", "LG AC vs Daikin", "LG AC vs Carrier",
  "LG AC cooling performance", "LG AC electricity bill", "LG AC noise level",
  "lg scale go", "cls31460001", "lg g5", "lg c4", "lg c5", "washtower",
];

// ──────────────────────────────────────────────────────────────────
// ENHANCED AI SYSTEM PROMPT (6-in-1 analysis)
// ──────────────────────────────────────────────────────────────────
const REVIEW_EXTRACTION_PROMPT = `You are an advanced review data extractor and analyzer for LG Electronics products. Extract individual product reviews from the given content and perform multi-dimensional analysis.

For each review, return a JSON array of objects with these fields:

## Core Fields
- model_number: string (LG model number if found, e.g. "OLED65C4PUA", "27GP850-B", "WM4000HWA". If not found, use category name)
- display_name: string (full product name, e.g. "LG C4 65-inch OLED TV")
- category: string (one of: TV, Monitor, Refrigerator, Washer, Dryer, Air Conditioner, Soundbar, Laptop, Projector, Robot Vacuum)
- title: string (review title or summary, max 100 chars)
- content: string (review text, max 500 chars)
- author: string or null
- rating: number 1-5 or null
- published_at: string ISO date or null

## 1️⃣ Expanded Keyword Detection
- detected_keywords: string[] (all relevant keywords found: product names, features/specs, sentiment words, comparison phrases, problem/desire expressions — ALL IN ENGLISH)

## 2️⃣ Brand Relevance Check
- brand_relevant: boolean (true if the mention is specifically about an LG Electronics product)
- brand_relevance_reason: string (1-2 sentence explanation of why it is/isn't relevant)

## 3️⃣ Granular Sentiment Analysis
- sentiment: "positive" | "negative" | "neutral" | "mixed"
- sentiment_score: number 0-1 (0=very negative, 1=very positive)
- emotion_category: string (one of: "satisfaction", "recommendation", "impressed", "neutral", "informational", "question", "complaint", "anger", "disappointment", "mixed")
- emotion_intensity: number 1-5 (1=very mild, 5=very strong)
- emotion_evidence: string (the key sentence that supports this emotion classification)

## 4️⃣ Noise Filtering
- content_type: string (one of: "review" = actual product evaluation, "general_mention" = casual mention not evaluating product, "advertisement" = promotional/sponsored content, "noise" = irrelevant mention like "bug" used in gaming context)
- noise_reason: string or null (if content_type is not "review", explain why)

## 5️⃣ User Segment Inference
- user_type: string (one of: "actual_user" = verified owner/user, "potential_customer" = considering purchase, "reviewer" = professional reviewer, "journalist" = press/media, "unknown")
- user_region: string or null (country code if detectable, e.g. "US", "UK", "KR")
- platform_type: string (one of: "community", "review_site", "video", "blog", "news")

## 6️⃣ Marketing Message Conversion
- marketing_message: object with:
  - original_summary: string (1-sentence summary of the user's opinion)
  - emotion_label: string (the emotion_category value)
  - copy: string (1-2 sentence marketing message derived from this review:
    - positive → recommendation copy
    - negative → improvement acknowledgment message
    - mixed → balanced message)

RULES:
- Only include actual user opinions/reviews, not product specs listings
- ALL keywords must be in ENGLISH regardless of source language
- If no reviews found, return empty array []
- Return ONLY valid JSON, no markdown`;

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

  const allDefaultKeywords = [...new Set([...LG_CATEGORIES, ...DOTCOM_KEYWORDS])];
  let targetCategories = allDefaultKeywords;
  let targetChannels = CHANNELS;
  try {
    const body = await req.json();
    if (body.categories?.length) targetCategories = body.categories;
    if (body.channels?.length) targetChannels = CHANNELS.filter((c) => body.channels.includes(c.id));
  } catch {
    // Use defaults
  }

  const { data: logEntry } = await supabase
    .from("collection_logs")
    .insert({ source: "firecrawl-all", status: "running" })
    .select()
    .single();

  const logId = logEntry?.id;
  let totalCollected = 0;
  const errors: string[] = [];

  try {
    for (const category of targetCategories) {
      for (const channel of targetChannels) {
        try {
          console.log(`[${channel.label}] Searching: ${category}`);

          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: channel.queryTemplate(category),
              limit: 5,
              scrapeOptions: { formats: ["markdown"] },
            }),
          });

          if (!searchRes.ok) {
            const errData = await searchRes.text();
            console.error(`[${channel.label}] Search failed: ${errData}`);
            errors.push(`${channel.label}/${category}: ${searchRes.status}`);
            continue;
          }

          const searchData = await searchRes.json();
          const results = searchData.data || [];
          console.log(`[${channel.label}] Found ${results.length} search results for ${category}`);

          if (results.length === 0) continue;

          for (const result of results) {
            const url = result.url;
            if (!url) continue;

            let content = result.markdown || "";

            if (!content || content.length < 200) {
              try {
                console.log(`[${channel.label}] Scraping: ${url}`);
                const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    url,
                    formats: ["markdown"],
                    onlyMainContent: true,
                  }),
                });

                if (scrapeRes.ok) {
                  const scrapeData = await scrapeRes.json();
                  content = scrapeData.data?.markdown || scrapeData.markdown || "";
                } else {
                  const errText = await scrapeRes.text();
                  console.error(`[${channel.label}] Scrape failed (${scrapeRes.status}): ${errText.slice(0, 200)}`);
                  content = result.description || "";
                }
              } catch (scrapeErr) {
                console.error(`[${channel.label}] Scrape error: ${scrapeErr}`);
                content = result.description || "";
              }
            }

            if (content.length < 100) continue;

            try {
              const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    { role: "system", content: REVIEW_EXTRACTION_PROMPT },
                    {
                      role: "user",
                      content: `Source: ${channel.label}\nURL: ${result.url || "unknown"}\nCategory: ${category}\n\nContent:\n${content.slice(0, 8000)}`,
                    },
                  ],
                  temperature: 0.1,
                  max_tokens: 6000,
                }),
              });

              if (!aiRes.ok) {
                console.error(`AI extraction failed for ${channel.label}/${category}`);
                continue;
              }

              const aiData = await aiRes.json();
              const rawText = aiData.choices?.[0]?.message?.content || "[]";

              let reviews: any[];
              try {
                const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                reviews = JSON.parse(cleaned);
                if (!Array.isArray(reviews)) reviews = [];
              } catch {
                console.error(`Failed to parse AI response for ${channel.label}/${category}`);
                continue;
              }

              for (const review of reviews) {
                if (!review.content || review.content.length < 20) continue;

                // Skip noise and non-relevant content
                if (review.content_type === "noise" || review.brand_relevant === false) {
                  console.log(`[${channel.label}] Skipped noise/irrelevant: ${review.title?.slice(0, 50)}`);
                  continue;
                }

                // Upsert product
                const modelNum = review.model_number || `LG-${category}-GENERIC`;
                const { data: existingProduct } = await supabase
                  .from("products")
                  .select("id")
                  .eq("model_number", modelNum)
                  .maybeSingle();

                let productId: string;
                if (existingProduct) {
                  productId = existingProduct.id;
                } else {
                  const { data: newProduct } = await supabase
                    .from("products")
                    .insert({
                      model_number: modelNum,
                      display_name: review.display_name || `LG ${category}`,
                      category: review.category || category,
                    })
                    .select("id")
                    .single();
                  productId = newProduct?.id;
                }

                if (!productId) continue;

                // Generate external_id to avoid duplicates
                const hashInput = review.content.slice(0, 100);
                let hash = 0;
                for (let i = 0; i < hashInput.length; i++) {
                  const char = hashInput.charCodeAt(i);
                  hash = ((hash << 5) - hash) + char;
                  hash |= 0;
                }
                const externalId = `${channel.id}-${Math.abs(hash).toString(36)}-${review.content.length}`;

                const { data: existingReview } = await supabase
                  .from("reviews")
                  .select("id")
                  .eq("external_id", externalId)
                  .maybeSingle();

                if (existingReview) continue;

                await supabase.from("reviews").insert({
                  product_id: productId,
                  source: channel.id,
                  source_url: result.url || null,
                  external_id: externalId,
                  title: review.title?.slice(0, 200) || null,
                  content: review.content.slice(0, 2000),
                  author: review.author || null,
                  rating: review.rating || null,
                  sentiment: review.sentiment || "neutral",
                  sentiment_score: review.sentiment_score ?? 0.5,
                  published_at: review.published_at || null,
                  // Enhanced analysis fields
                  emotion_category: review.emotion_category || "neutral",
                  emotion_intensity: review.emotion_intensity || 3,
                  user_type: review.user_type || "unknown",
                  content_type: review.content_type || "review",
                  platform_type: review.platform_type || "unknown",
                });

                totalCollected++;
              }
            } catch (aiErr) {
              console.error(`AI processing error: ${aiErr}`);
            }
          }
        } catch (channelErr) {
          console.error(`[${channel.label}] Error: ${channelErr}`);
          errors.push(`${channel.label}/${category}: ${channelErr}`);
        }
      }
    }

    // Update trending snapshots
    await updateTrendingSnapshots(supabase);

    if (logId) {
      await supabase.from("collection_logs").update({
        status: errors.length > 0 ? "partial" : "completed",
        items_collected: totalCollected,
        completed_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, collected: totalCollected, errors: errors.length }),
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

async function updateTrendingSnapshots(supabase: any) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: products } = await supabase.from("products").select("id, model_number, display_name");
    if (!products?.length) return;

    for (const product of products) {
      const { data: recentReviews } = await supabase
        .from("reviews")
        .select("source, sentiment, sentiment_score")
        .eq("product_id", product.id)
        .gte("collected_at", sevenDaysAgo);

      if (!recentReviews?.length) continue;

      const bySource: Record<string, any[]> = {};
      for (const r of recentReviews) {
        if (!bySource[r.source]) bySource[r.source] = [];
        bySource[r.source].push(r);
      }

      for (const [source, reviews] of Object.entries(bySource)) {
        const avgScore = reviews.reduce((sum: number, r: any) => sum + (r.sentiment_score || 0.5), 0) / reviews.length;

        await supabase.from("trending_snapshots").insert({
          product_id: product.id,
          source,
          mention_count: reviews.length,
          avg_sentiment_score: Math.round(avgScore * 100) / 100,
          trend: reviews.length > 3 ? "up" : "stable",
          snapshot_date: new Date().toISOString().split("T")[0],
        });
      }
    }

    // Extract trending keywords using enhanced prompt
    const { data: recentAllReviews } = await supabase
      .from("reviews")
      .select("content, source, sentiment, emotion_category, user_type, content_type")
      .gte("collected_at", sevenDaysAgo)
      .eq("content_type", "review")
      .limit(200);

    if (recentAllReviews?.length > 10) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const combinedText = recentAllReviews
        .map((r: any) => `[${r.source}/${r.sentiment}/${r.emotion_category}/${r.user_type}] ${r.content.slice(0, 200)}`)
        .join("\n");

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Extract top trending keywords from LG product reviews. Focus on ADJECTIVES and descriptive words that express product qualities or user experience.

KEYWORD CATEGORIES TO EXTRACT (all in ENGLISH):
1. Feature/Spec descriptors: words describing how features perform (e.g., "responsive", "laggy", "crisp")
2. Emotional descriptors: how users feel (e.g., "satisfied", "frustrated", "impressed")
3. Comparison indicators: words used when comparing (e.g., "better", "superior", "inferior")
4. Problem descriptors: words describing issues (e.g., "buggy", "unreliable", "inconsistent")

STRICTLY EXCLUDE: brand names, product names, model numbers, generic nouns, technology specs.

Return JSON array of objects:
- keyword: string (the adjective/descriptive keyword, ENGLISH only)
- count: number (estimated frequency)
- sentiment: "positive" | "negative" | "neutral"
- source: string (most common source)
- related_products: string[] (model numbers mentioned with this keyword)
- related_countries: string[] (country codes if mentioned)
- keyword_category: string ("feature_spec" | "emotional" | "comparison" | "problem")

Return 20-30 keywords. ONLY valid JSON, no markdown.`,
            },
            { role: "user", content: combinedText.slice(0, 10000) },
          ],
          temperature: 0.1,
          max_tokens: 3000,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const rawText = aiData.choices?.[0]?.message?.content || "[]";
        try {
          const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const keywords = JSON.parse(cleaned);
          if (Array.isArray(keywords)) {
            for (const kw of keywords) {
              await supabase.from("trending_keywords").insert({
                keyword: kw.keyword,
                count: kw.count || 1,
                sentiment: kw.sentiment || "neutral",
                source: kw.source || "mixed",
                related_products: kw.related_products || [],
                related_countries: kw.related_countries || [],
                snapshot_date: new Date().toISOString().split("T")[0],
              });
            }
          }
        } catch {
          console.error("Failed to parse trending keywords");
        }
      }
    }
  } catch (err) {
    console.error("Error updating trending snapshots:", err);
  }
}
