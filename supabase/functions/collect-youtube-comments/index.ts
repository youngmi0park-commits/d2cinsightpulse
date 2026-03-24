import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// LG Electronics official YouTube channels (excluding Korea)
const LG_YOUTUBE_CHANNELS = [
  { id: "LGUSAChannel", label: "LG USA", region: "us", searchQuery: "site:youtube.com/@LG LG review OR unboxing OR setup" },
  { id: "LGUKChannel", label: "LG UK", region: "uk", searchQuery: "site:youtube.com/@LGUK LG review OR unboxing" },
  { id: "LGGlobal", label: "LG Global", region: "global", searchQuery: "site:youtube.com/@LGGlobal LG product review" },
  { id: "LGIndia", label: "LG India", region: "in", searchQuery: "site:youtube.com/@LGIndia LG review OR unboxing" },
  { id: "LGAustralia", label: "LG Australia", region: "au", searchQuery: "site:youtube.com/@LGAustralia LG review" },
];

// Additional search queries for LG product reviews on YouTube (broader)
const LG_YOUTUBE_SEARCH_QUERIES = [
  "site:youtube.com LG OLED C4 review comments",
  "site:youtube.com LG Gram 2025 review",
  "site:youtube.com LG WashTower review",
  "site:youtube.com LG InstaView refrigerator review",
  "site:youtube.com LG UltraGear monitor review",
  "site:youtube.com LG Soundbar review 2025",
  "site:youtube.com LG air conditioner dual inverter review",
  "site:youtube.com LG StanbyME review",
];

const COMMENT_EXTRACTION_PROMPT = `You are an advanced YouTube comment data extractor for LG Electronics products. Extract individual viewer comments/opinions from the given YouTube page content.

For each comment/opinion found, return a JSON array of objects with these fields:

## Core Fields
- model_number: string (LG model if mentioned, else use category like "LG-TV-GENERIC")
- display_name: string (full product name mentioned in video/comments)
- category: string (one of: TV, Monitor, Refrigerator, Washer, Dryer, Air Conditioner, Soundbar, Laptop, Projector, Robot Vacuum, Dishwasher, General)
- title: string (video title or comment summary, max 100 chars)
- content: string (the comment text or summarized opinion, max 500 chars)
- author: null (ALWAYS null — never store real usernames for privacy)
- rating: number 1-5 or null (inferred from sentiment if no explicit rating)
- published_at: string ISO date or null

## Analysis Fields
- sentiment: "positive" | "negative" | "neutral" | "mixed"
- sentiment_score: number 0-1
- emotion_category: string ("satisfaction" | "recommendation" | "impressed" | "neutral" | "informational" | "question" | "complaint" | "anger" | "disappointment" | "mixed")
- emotion_intensity: number 1-5
- content_type: "review" | "general_mention" | "question" | "noise"
- user_type: "actual_user" | "potential_customer" | "unknown"
- platform_type: "video" (always "video" for YouTube)
- brand_relevant: boolean
- topics: string[] (from: picture_quality, brightness, sound, build, thermals, battery, noise, energy, cooling_speed, installation, connectivity, software, warranty, delivery, capacity, cleaning_performance, portability)
- pain_points: array of { type: string, snippet: string, severity: 1-5 }
- strengths: array of { feature: string, snippet: string }
- quotes: string[] (1-2 marketing-ready sentences, 30-140 chars, no exaggeration)

## CRITICAL PRIVACY RULES:
- NEVER extract real usernames — always set author to null
- NEVER extract personal information (email, phone, location details)
- Remove any PII from content text
- Only extract product-related opinions

## QUALITY RULES:
- Skip spam, self-promotion, and off-topic comments
- Skip comments shorter than 15 characters
- Only include comments about LG products
- ALL keywords must be in ENGLISH
- Return ONLY valid JSON array, no markdown`;

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
  let channels = LG_YOUTUBE_CHANNELS;
  let extraQueries = LG_YOUTUBE_SEARCH_QUERIES;
  let maxPerChannel = 3;

  try {
    const body = await req.json();
    if (body.channels?.length) {
      channels = LG_YOUTUBE_CHANNELS.filter(c => body.channels.includes(c.id));
    }
    if (body.maxPerChannel) maxPerChannel = body.maxPerChannel;
    if (body.skipExtraQueries) extraQueries = [];
  } catch {
    // defaults
  }

  // Create collection log
  const { data: logEntry } = await supabase
    .from("collection_logs")
    .insert({ source: "youtube_comments", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  let totalCollected = 0;
  const errors: string[] = [];

  try {
    // 1. Search official LG YouTube channels
    for (const channel of channels) {
      try {
        console.log(`[YouTube/${channel.label}] Searching...`);

        const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: channel.searchQuery,
            limit: maxPerChannel,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (!searchRes.ok) {
          const errText = await searchRes.text();
          console.error(`[YouTube/${channel.label}] Search failed: ${errText}`);
          errors.push(`${channel.label}: ${searchRes.status}`);
          continue;
        }

        const searchData = await searchRes.json();
        const results = searchData.data || [];
        console.log(`[YouTube/${channel.label}] Found ${results.length} videos`);

        for (const result of results) {
          const collected = await processYouTubeResult(
            result, `youtube_${channel.id}`, channel.label, channel.region,
            supabase, FIRECRAWL_API_KEY, LOVABLE_API_KEY, errors
          );
          totalCollected += collected;
        }
      } catch (chErr) {
        console.error(`[YouTube/${channel.label}] Error: ${chErr}`);
        errors.push(`${channel.label}: ${chErr}`);
      }
    }

    // 2. Search broader LG product review videos
    for (const query of extraQueries.slice(0, 4)) {
      try {
        console.log(`[YouTube/Search] ${query.slice(0, 60)}...`);

        const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: 2,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (!searchRes.ok) continue;

        const searchData = await searchRes.json();
        const results = searchData.data || [];

        for (const result of results) {
          const collected = await processYouTubeResult(
            result, "youtube", "YouTube", "global",
            supabase, FIRECRAWL_API_KEY, LOVABLE_API_KEY, errors
          );
          totalCollected += collected;
        }
      } catch {
        // continue
      }
    }

    // Update log
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

async function processYouTubeResult(
  result: any,
  sourceId: string,
  sourceLabel: string,
  region: string,
  supabase: any,
  firecrawlKey: string,
  lovableKey: string,
  errors: string[]
): Promise<number> {
  const url = result.url;
  if (!url || !url.includes("youtube.com")) return 0;

  let content = result.markdown || "";

  // If content is too short, try scraping the page
  if (content.length < 200) {
    try {
      const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      });

      if (scrapeRes.ok) {
        const scrapeData = await scrapeRes.json();
        content = scrapeData.data?.markdown || scrapeData.markdown || content;
      }
    } catch {
      // use existing content
    }
  }

  if (content.length < 80) return 0;

  // AI extraction
  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: COMMENT_EXTRACTION_PROMPT },
          {
            role: "user",
            content: `Source: ${sourceLabel} (YouTube, region: ${region})\nURL: ${url}\n\nPage Content:\n${content.slice(0, 10000)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 5000,
      }),
    });

    if (!aiRes.ok) {
      console.error(`AI extraction failed for ${url}`);
      return 0;
    }

    const aiData = await aiRes.json();
    const rawText = aiData.choices?.[0]?.message?.content || "[]";

    let reviews: any[];
    try {
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      reviews = JSON.parse(cleaned);
      if (!Array.isArray(reviews)) reviews = [];
    } catch {
      console.error(`Failed to parse AI response for ${url}`);
      return 0;
    }

    let saved = 0;
    for (const review of reviews) {
      if (!review.content || review.content.length < 15) continue;
      if (review.content_type === "noise" || review.brand_relevant === false) continue;

      // Privacy: force author to null
      review.author = null;

      const modelNum = review.model_number || `LG-${review.category || "General"}-GENERIC`;

      // Find or create product
      const { data: existingProduct } = await supabase
        .from("products").select("id").eq("model_number", modelNum).maybeSingle();

      let productId: string;
      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        const { data: newProduct } = await supabase
          .from("products")
          .insert({
            model_number: modelNum,
            display_name: review.display_name || `LG ${review.category || "Product"}`,
            category: review.category || "General",
          })
          .select("id").single();
        productId = newProduct?.id;
      }
      if (!productId) continue;

      // Dedup via external_id hash
      const hashInput = review.content.slice(0, 100);
      let hash = 0;
      for (let i = 0; i < hashInput.length; i++) {
        hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
        hash |= 0;
      }
      const externalId = `${sourceId}-${Math.abs(hash).toString(36)}-${review.content.length}`;

      const { data: existing } = await supabase
        .from("reviews").select("id").eq("external_id", externalId).maybeSingle();
      if (existing) continue;

      await supabase.from("reviews").insert({
        product_id: productId,
        source: sourceId,
        source_url: url,
        external_id: externalId,
        title: review.title?.slice(0, 200) || null,
        content: review.content.slice(0, 2000),
        author: null, // Always null for privacy
        rating: review.rating || null,
        sentiment: review.sentiment || "neutral",
        sentiment_score: review.sentiment_score ?? 0.5,
        published_at: review.published_at || null,
        emotion_category: review.emotion_category || "neutral",
        emotion_intensity: review.emotion_intensity || 3,
        user_type: review.user_type || "unknown",
        content_type: review.content_type || "review",
        platform_type: "video",
      });
      saved++;
    }
    return saved;
  } catch (aiErr) {
    console.error(`AI error for ${url}: ${aiErr}`);
    errors.push(`YouTube AI: ${aiErr}`);
    return 0;
  }
}
