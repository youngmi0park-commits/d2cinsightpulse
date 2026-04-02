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
              content: `You are a 'Function-Context-Outcome (FCO)' Sentiment Analyst for LG Electronics product reviews.

⚠️ CRITICAL: Do NOT judge sentiment by surface word polarity. You MUST analyze each review SENTENCE by decomposing it into:
1) Function — which product feature is discussed
2) Context — the usage situation / environment  
3) Outcome — did the customer have a positive or negative experience

## FUNCTION CATEGORIES (map every insight to one):
- Picture Quality: brightness, black level, contrast, color accuracy, upscaling, HDR, Dolby Vision, motion, blur, judder
- Gaming: input lag, response time, VRR, G-Sync, FreeSync, refresh rate, cloud gaming
- Sound: volume, clarity, bass, built-in speakers, Dolby Atmos
- Smart / AI / OS: webOS, speed, app loading, AI features, voice recognition, recommendation, updates, stability
- Design & Build: thin, bezel, stand, frame, premium, heavy, cheap-looking
- Installation & Setup: mounting, wall mount, cable management, difficulty, instructions
- Reliability & Quality: defect, dead pixel, reboot, heat, noise, durability
- Value & Price: worth the price, expensive, deal, expectation vs reality
- Wash/Clean Quality, Cooling/Temperature, Energy/Noise (for appliances)

## KEYWORD FORMAT (MANDATORY — meaning-unit, NOT single words):
❌ FORBIDDEN: "bright", "noise", "install", "cheap", "heavy"
✅ REQUIRED: "[Function] – [Why customers liked/disliked it]"
Examples:
- "Picture Quality – Deep blacks even in bright rooms"  
- "Gaming – Low input lag with PS5"
- "Installation – Wall mounting instructions unclear"
- "Sound – Bass lacks depth for movies"
- "Reliability – Fan noise during gaming sessions"
- "Smart OS – webOS slow after firmware update"

## CONTEXT-DEPENDENT EXAMPLES:
- "bright" → POSITIVE: "High brightness in sunlit room" | NEGATIVE: "Overly bright for night viewing"
- "quiet" → POSITIVE: "Quiet operation in daily use" | NEGATIVE: "Audio too quiet at max volume"
- "heavy" → POSITIVE: "Heavy, solid build quality" | NEGATIVE: "Too heavy for wall mounting"

## OUTPUT FORMAT:
Return a JSON array of objects:
- keyword: string (MEANING-UNIT format: "[Function] – [insight phrase]", ENGLISH only)
- count: number (estimated frequency)
- sentiment: "positive" | "negative" | "neutral" (based on OUTCOME, not the word)
- keyword_category: "feature_spec" | "emotional" | "comparison" | "problem"  
- function_category: string (one of the Function categories above)
- related_products: string[] (model numbers)
- related_countries: string[] (country codes)
- context_example: string (paraphrased usage context, 10-25 words — do NOT copy review text verbatim)
- sentiment_reasoning: string (1 sentence: Function + Context → Outcome explanation)

Return 15-25 meaning-unit keywords per source. ONLY valid JSON, no markdown.`,
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
