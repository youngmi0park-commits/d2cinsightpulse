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
  const today = new Date().toISOString().split("T")[0];

  try {
    // Use published_at for weekly window (matches BV data pattern)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: reviews } = await supabase
      .from("reviews")
      .select("content, source, sentiment, emotion_category, user_type, content_type, product_id, products!inner(model_number, display_name, category)")
      .gte("published_at", sevenDaysAgo)
      .eq("content_type", "review")
      .limit(500);

    if (!reviews?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No recent reviews to extract from", keywords: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also generate trending_snapshots from the same weekly data
    const productAgg: Record<string, { product_id: string; source: string; count: number; scores: number[]; sentiments: string[] }> = {};
    for (const r of reviews) {
      const key = r.product_id + "|" + r.source;
      if (!productAgg[key]) {
        productAgg[key] = { product_id: r.product_id, source: r.source, count: 0, scores: [], sentiments: [] };
      }
      productAgg[key].count++;
      if (r.sentiment) productAgg[key].sentiments.push(r.sentiment);
    }

    // Insert trending snapshots for today
    const snapshotRows = Object.values(productAgg)
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
      .map((agg, idx) => {
        const posCount = agg.sentiments.filter(s => s === "positive").length;
        const avgScore = agg.sentiments.length > 0 ? posCount / agg.sentiments.length : 0.5;
        // Normalize source for grouping
        let normSource = agg.source;
        if (normSource.startsWith("lge_com")) normSource = "lge_com";
        if (normSource.startsWith("reddit")) normSource = "reddit";
        if (normSource.startsWith("youtube")) normSource = "youtube";
        if (normSource.startsWith("amazon")) normSource = "amazon";
        return {
          product_id: agg.product_id,
          source: normSource,
          mention_count: agg.count,
          avg_sentiment_score: Math.round(avgScore * 100) / 100,
          trend: avgScore > 0.6 ? "up" : avgScore < 0.4 ? "down" : "stable",
          change_percent: 0,
          rank: idx + 1,
          snapshot_date: today,
        };
      });

    if (snapshotRows.length > 0) {
      const { error: snapErr } = await supabase
        .from("trending_snapshots")
        .upsert(snapshotRows, { onConflict: "id" });
      if (snapErr) console.error("Snapshot insert error:", snapErr.message);
      else console.log("Inserted", snapshotRows.length, "trending snapshots for", today);
    }

    // Now extract keywords per source
    const bySource: Record<string, any[]> = {};
    for (const r of reviews) {
      let normSrc = r.source;
      if (normSrc.startsWith("lge_com")) normSrc = "lge_com";
      if (normSrc.startsWith("reddit")) normSrc = "reddit";
      if (normSrc.startsWith("youtube")) normSrc = "youtube";
      if (normSrc.startsWith("amazon")) normSrc = "amazon";
      if (!bySource[normSrc]) bySource[normSrc] = [];
      bySource[normSrc].push(r);
    }

    let totalKeywords = 0;

    // Process top 5 sources to stay within timeout
    const sortedSources = Object.entries(bySource)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    for (const [source, sourceReviews] of sortedSources) {
      const combinedText = sourceReviews
        .map((r: any) => {
          const prod = r.products as any;
          return "[" + (r.sentiment || "unknown") + "/" + (r.emotion_category || "unknown") + "] " + (prod?.display_name || "") + ": " + r.content.slice(0, 250);
        })
        .join("\n");

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + LOVABLE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a FCO (Function-Context-Outcome) Sentiment Analyst for LG Electronics product reviews.\n\nExtract 10-15 meaning-unit keywords from the reviews.\n\nKEYWORD FORMAT: \"[Function] - [Why customers liked/disliked it]\"\nExamples: \"Picture Quality - Deep blacks even in bright rooms\", \"Installation - Wall mounting instructions unclear\"\n\nReturn a JSON array with objects:\n- keyword: string (meaning-unit format, ENGLISH only)\n- count: number (estimated frequency)\n- sentiment: \"positive\" | \"negative\"\n- related_products: string[] (model numbers mentioned)\n- related_countries: string[] (country codes: US, UK, DE, AU, IN, TW, JP, TH)\n\nOnly valid JSON, no markdown.",
            },
            { role: "user", content: "Source: " + source + " (" + sourceReviews.length + " reviews)\n\n" + combinedText.slice(0, 10000) },
          ],
          temperature: 0.1,
          max_tokens: 3000,
        }),
      });

      if (!aiRes.ok) {
        console.error("AI failed for source " + source + ": " + aiRes.status);
        continue;
      }

      const aiData = await aiRes.json();
      const rawText = aiData.choices?.[0]?.message?.content || "[]";

      try {
        const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const keywords = JSON.parse(cleaned);
        if (!Array.isArray(keywords)) continue;

        for (const kw of keywords) {
          if (!kw.keyword || kw.keyword.length < 5) continue;

          await supabase.from("trending_keywords").insert({
            keyword: kw.keyword,
            count: kw.count || 1,
            sentiment: kw.sentiment || "neutral",
            source: source,
            related_products: kw.related_products || [],
            related_countries: kw.related_countries || [],
            snapshot_date: today,
          });
          totalKeywords++;
        }
      } catch {
        console.error("Failed to parse keywords for " + source);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        keywords: totalKeywords,
        snapshots: snapshotRows.length,
        sources: sortedSources.length,
        date: today,
        reviewsAnalyzed: reviews.length,
      }),
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
