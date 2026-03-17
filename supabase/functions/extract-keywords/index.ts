import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: reviews } = await supabase
      .from("reviews")
      .select("content, source, sentiment, emotion_category, user_type, content_type, product_id, products!inner(model_number, display_name, category)")
      .gte("collected_at", fourteenDaysAgo)
      .eq("content_type", "review")
      .limit(500);

    if (!reviews?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No recent reviews to extract from", keywords: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bySource: Record<string, any[]> = {};
    for (const r of reviews) {
      if (!bySource[r.source]) bySource[r.source] = [];
      bySource[r.source].push(r);
    }

    let totalKeywords = 0;

    for (const [source, sourceReviews] of Object.entries(bySource)) {
      const combinedText = sourceReviews
        .map((r: any) => `[${r.sentiment}/${r.emotion_category || "unknown"}/${r.user_type || "unknown"}] ${r.content.slice(0, 300)}`)
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
              content: `You are a keyword extractor for LG Electronics product reviews. Extract ONLY ADJECTIVES and DESCRIPTIVE PHRASES in ENGLISH.

KEYWORD CATEGORIES (tag each keyword):
1. "feature_spec" — describes product feature performance (e.g., "responsive", "crisp", "laggy", "dim", "smooth", "sharp")
2. "emotional" — describes user feeling (e.g., "satisfied", "frustrated", "impressed", "disappointed", "delighted")
3. "comparison" — used when comparing products (e.g., "better", "superior", "inferior", "comparable", "unmatched")
4. "problem" — describes issues or desires (e.g., "buggy", "unreliable", "inconsistent", "missing", "incomplete")

⚠️ CRITICAL — CONTEXT-AWARE SENTIMENT CLASSIFICATION:
You MUST read the FULL surrounding context of each keyword before assigning sentiment. Do NOT assign sentiment based on the word alone.

Examples of context-dependent classification:
- "quiet" → positive when describing a washing machine ("it's really quiet"), but could be negative if describing audio output ("the sound is too quiet")
- "heavy" → negative for a laptop ("too heavy to carry"), but could be positive for build quality ("feels heavy and solid")
- "bright" → positive for a TV screen ("bright and vivid colors"), but negative for a bedroom TV ("too bright at night, hurts my eyes")
- "cheap" → negative when implying low quality ("feels cheap and flimsy"), but positive when meaning affordable ("cheap compared to competitors")
- "aggressive" → positive for gaming ("aggressive response time"), but negative for fan noise ("aggressive fan noise")
- "simple" → positive for UI ("simple and intuitive"), but negative for features ("too simple, lacks features")
- "soft" → positive for closing mechanism ("soft-close doors"), but negative for image quality ("image looks soft and blurry")

Process for EACH keyword:
1. Find ALL occurrences of the keyword in the reviews
2. Read the full sentence and surrounding sentences for each occurrence
3. Determine the INTENT of the author — are they praising or criticizing?
4. If the word appears in both positive and negative contexts, classify based on the MAJORITY usage
5. Provide a "context_example" that clearly shows the sentiment context

RULES:
1. ALL keywords must be in ENGLISH regardless of source language
2. ONLY extract adjectives and descriptive words
3. STRICTLY EXCLUDE:
   - Brand names: LG, Samsung, Sony, etc.
   - Product names/types: TV, refrigerator, monitor, OLED, smart TV, etc.
   - Model numbers: C4, G4, UR9000, etc.
   - Generic nouns: engineer, customer service, warranty, app, compressor, etc.
   - Technology specs: 4K, HDR, HDMI, etc.
4. Focus on words that describe HOW the product performs or HOW the user feels

Return a JSON array of objects:
- keyword: string (the adjective/descriptive word, ENGLISH only)
- count: number (estimated frequency in the reviews)
- sentiment: "positive" | "negative" | "neutral" (based on FULL CONTEXT, not the word itself)
- keyword_category: string ("feature_spec" | "emotional" | "comparison" | "problem")
- related_products: string[] (model numbers mentioned alongside this adjective)
- related_countries: string[] (country codes if mentioned, e.g. ["US","UK"])
- context_example: string (a brief quote from the review showing the keyword IN CONTEXT, 10-25 words)
- sentiment_reasoning: string (1 sentence explaining WHY this sentiment was assigned based on context)

Return 15-25 keywords per source. ONLY valid JSON, no markdown.`,
            },
            { role: "user", content: `Source: ${source}\n\n${combinedText.slice(0, 12000)}` },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });

      if (!aiRes.ok) {
        console.error(`AI failed for source ${source}: ${aiRes.status}`);
        continue;
      }

      const aiData = await aiRes.json();
      const rawText = aiData.choices?.[0]?.message?.content || "[]";

      try {
        const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const keywords = JSON.parse(cleaned);
        if (!Array.isArray(keywords)) continue;

        const excludePatterns = /^(lg|samsung|sony|tv|oled|qled|monitor|refrigerator|washer|dryer|washing machine|smart tv|4k|hdr|hdmi|engineer|customer service|warranty|app|compressor|ice maker|soundbar|laptop|projector|air conditioner|freezer|microwave|dishwasher|alexa|webos|nanocell|qned|ultragear|standbyme|thinq|xboom|puricare)/i;

        for (const kw of keywords) {
          if (!kw.keyword || excludePatterns.test(kw.keyword.trim())) continue;

          await supabase.from("trending_keywords").insert({
            keyword: kw.keyword,
            count: kw.count || 1,
            sentiment: kw.sentiment || "neutral",
            source: source,
            related_products: kw.related_products || [],
            related_countries: kw.related_countries || [],
            snapshot_date: new Date().toISOString().split("T")[0],
          });
          totalKeywords++;
        }
      } catch {
        console.error(`Failed to parse keywords for ${source}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, keywords: totalKeywords, sources: Object.keys(bySource).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
