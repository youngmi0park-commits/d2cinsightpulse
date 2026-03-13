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
    // Get recent reviews (last 14 days for more data)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: reviews } = await supabase
      .from("reviews")
      .select("content, source, sentiment, product_id, products!inner(model_number, display_name, category)")
      .gte("collected_at", fourteenDaysAgo)
      .limit(500);

    if (!reviews?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No recent reviews to extract from", keywords: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group reviews by source for per-source keyword extraction
    const bySource: Record<string, any[]> = {};
    for (const r of reviews) {
      if (!bySource[r.source]) bySource[r.source] = [];
      bySource[r.source].push(r);
    }

    let totalKeywords = 0;

    for (const [source, sourceReviews] of Object.entries(bySource)) {
      const combinedText = sourceReviews
        .map((r: any) => `[${r.sentiment}] ${r.content.slice(0, 300)}`)
        .join("\n");

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a keyword extractor for LG Electronics product reviews. Your task is to extract ONLY ADJECTIVES and DESCRIPTIVE PHRASES that express product qualities or user experience.

RULES:
1. ONLY extract adjectives and descriptive words (e.g., "stunning", "reliable", "noisy", "efficient", "frustrating", "responsive", "crisp", "vibrant", "sluggish", "durable")
2. STRICTLY EXCLUDE:
   - Brand names: LG, Samsung, Sony, etc.
   - Product names/types: TV, refrigerator, monitor, washer, OLED, smart TV, etc.
   - Model numbers: C4, G4, UR9000, etc.
   - Generic nouns: engineer, customer service, warranty, app, compressor, ice maker, etc.
   - Technology specs: 4K, HDR, HDMI, etc.
3. Focus on words that describe HOW the product performs or HOW the user feels
4. Include both English and descriptive compound phrases (e.g., "picture quality" → rephrase as "sharp", "clear")

Return a JSON array of objects:
- keyword: string (the adjective/descriptive word)
- count: number (estimated frequency in the reviews)
- sentiment: "positive" | "negative" | "neutral"
- related_products: string[] (model numbers mentioned alongside this adjective)
- related_countries: string[] (country codes if mentioned, e.g. ["US","UK"])

Return 15-25 adjective keywords per source. ONLY valid JSON, no markdown.`,
            },
            { role: "user", content: `Source: ${source}\n\n${combinedText.slice(0, 12000)}` },
          ],
          temperature: 0.1,
          max_tokens: 3000,
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

        // Filter out any remaining non-adjective keywords as a safety net
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
