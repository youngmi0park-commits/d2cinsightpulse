import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Weekly Report Engine
 * Analyzes reviews by country + week, classifies review types,
 * and produces structured insight JSON.
 *
 * POST body: { country?: "US"|"UK", week_range?: "2026-W12" }
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let country = "US";
  let weekRange = "";

  try {
    const body = await req.json();
    if (body.country) country = body.country.toUpperCase();
    if (body.week_range) weekRange = body.week_range;
  } catch { /* defaults */ }

  // Determine date range for the week
  const { startDate, endDate, resolvedWeek } = resolveWeekRange(weekRange);

  // Determine source filter based on country
  const sourceFilter = country === "UK" ? "lge_com_uk" : "lge_com_us";

  try {
    // Fetch reviews for the period
    const { data: reviews, error: dbErr } = await supabase
      .from("reviews")
      .select("id, content, title, rating, sentiment, sentiment_score, emotion_category, emotion_intensity, source, published_at, review_type, user_type, content_type, product_id")
      .or(`source.eq.${sourceFilter},source.ilike.%${country.toLowerCase()}%`)
      .gte("collected_at", startDate)
      .lte("collected_at", endDate)
      .order("collected_at", { ascending: false })
      .limit(500);

    if (dbErr) throw dbErr;

    const reviewList = reviews || [];

    // Get product info for product_ids
    const productIds = [...new Set(reviewList.map(r => r.product_id))];
    const { data: products } = await supabase
      .from("products")
      .select("id, model_number, display_name, category")
      .in("id", productIds.length > 0 ? productIds : ["00000000-0000-0000-0000-000000000000"]);

    const productMap = new Map((products || []).map(p => [p.id, p]));

    // Classify review types & compute stats
    const typeCounts = { organic: 0, paid: 0, syndication: 0, mixed: 0 };
    const ratingByType: Record<string, number[]> = { organic: [], paid: [], syndication: [], mixed: [] };
    const allRatings: number[] = [];

    for (const r of reviewList) {
      const rt = r.review_type || "organic";
      typeCounts[rt as keyof typeof typeCounts] = (typeCounts[rt as keyof typeof typeCounts] || 0) + 1;
      if (r.rating) {
        ratingByType[rt]?.push(r.rating);
        allRatings.push(r.rating);
      }
    }

    const total = reviewList.length;
    const avg = (arr: number[]) => arr.length > 0 ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;

    const summary = {
      total_reviews: total,
      organic_pct: total > 0 ? +((typeCounts.organic / total) * 100).toFixed(1) : 0,
      paid_pct: total > 0 ? +((typeCounts.paid / total) * 100).toFixed(1) : 0,
      syndication_pct: total > 0 ? +((typeCounts.syndication / total) * 100).toFixed(1) : 0,
      avg_rating: avg(allRatings),
      avg_rating_by_type: {
        organic: avg(ratingByType.organic),
        paid: avg(ratingByType.paid),
        syndication: avg(ratingByType.syndication),
      },
    };

    // If no reviews, return minimal report
    if (total === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          report: {
            country,
            week_range: resolvedWeek,
            date_range: { start: startDate, end: endDate },
            summary: { ...summary },
            insights: { top_strengths: [], top_pain_points: [], feature_topics: [], issue_clusters: [] },
            content_recommendations: { pdp_updates: [], faq_candidates: [], inside_channel_copy: [], outside_channel_copy: [], visual_guidelines: [] },
            notes: "No reviews found for this period.",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare review data for AI analysis (titles + sentiment, no full text)
    const reviewSummaries = reviewList.slice(0, 200).map(r => {
      const prod = productMap.get(r.product_id);
      return {
        title: r.title?.slice(0, 100) || "",
        sentiment: r.sentiment,
        score: r.sentiment_score,
        rating: r.rating,
        emotion: r.emotion_category,
        product: prod?.display_name || "",
        category: prod?.category || "",
        review_type: r.review_type || "organic",
      };
    });

    // AI-powered insight extraction
    const aiPrompt = `You are analyzing ${total} LG.com ${country} reviews for week ${resolvedWeek}.

Review summaries (title/sentiment/rating only — NO full text):
${JSON.stringify(reviewSummaries, null, 1).slice(0, 6000)}

Summary stats:
${JSON.stringify(summary)}

Generate a weekly insight report in this EXACT JSON format:
{
  "top_strengths": [{"keyword": "string", "count": number, "snippet": "10-20 char masked snippet"}],
  "top_pain_points": [{"keyword": "string", "count": number, "severity": 1-5}],
  "feature_topics": [{"topic": "string", "positive": number, "negative": number}],
  "issue_clusters": [{"cluster_name": "string", "frequency": number, "is_new": boolean, "description": "string"}],
  "content_recommendations": {
    "pdp_updates": ["string"],
    "faq_candidates": [{"q": "string", "a_outline": "string"}],
    "inside_channel_copy": ["string — USP-based, spec-focused"],
    "outside_channel_copy": ["string — scene-based, emotional"],
    "visual_guidelines": ["string — using scene photo guide"]
  },
  "positive_highlights": [{"snippet": "10-25 char masked", "context": "string"}],
  "weekly_trend": "improving|stable|declining"
}

RULES:
- Top 5 strengths and pain points by frequency
- Feature topics: brightness, audio, usability, connectivity, value, design, smart features
- Snippets MUST be 10-25 chars, masked with "…" (e.g., "터치 반응이 … 빠름")
- NEVER include full review text
- Return ONLY valid JSON, no markdown`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a weekly review report engine for LG Electronics D2C. Return ONLY valid JSON." },
          { role: "user", content: aiPrompt },
        ],
        temperature: 0.15,
        max_tokens: 4000,
      }),
    });

    let insights: any = {};
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content || "{}";
      try {
        insights = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      } catch {
        insights = { raw_response: raw.slice(0, 500) };
      }
    }

    const report = {
      country,
      week_range: resolvedWeek,
      date_range: { start: startDate, end: endDate },
      summary,
      insights: {
        top_strengths: insights.top_strengths || [],
        top_pain_points: insights.top_pain_points || [],
        feature_topics: insights.feature_topics || [],
        issue_clusters: insights.issue_clusters || [],
      },
      positive_highlights: insights.positive_highlights || [],
      weekly_trend: insights.weekly_trend || "stable",
      content_recommendations: insights.content_recommendations || {
        pdp_updates: [],
        faq_candidates: [],
        inside_channel_copy: [],
        outside_channel_copy: [],
        visual_guidelines: [],
      },
      notes: "Full review text is never exposed; all snippets masked.",
    };

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Weekly report error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** Resolve week range string to start/end dates */
function resolveWeekRange(weekRange: string): { startDate: string; endDate: string; resolvedWeek: string } {
  const now = new Date();

  if (weekRange && /^\d{4}-W\d{1,2}$/.test(weekRange)) {
    const [yearStr, weekStr] = weekRange.split("-W");
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);

    // ISO week to date
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);

    const startDate = new Date(startOfWeek1);
    startDate.setDate(startOfWeek1.getDate() + (week - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0] + "T23:59:59",
      resolvedWeek: weekRange,
    };
  }

  // Default: current week
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Calculate ISO week number
  const tempDate = new Date(monday);
  tempDate.setDate(tempDate.getDate() + 3);
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return {
    startDate: monday.toISOString().split("T")[0],
    endDate: sunday.toISOString().split("T")[0] + "T23:59:59",
    resolvedWeek: `${monday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`,
  };
}
