const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CollectRequest {
  countries?: string[];
  platforms?: string[];
  categories?: string[];
  maxPages?: number;
}

// Country → platform mapping
const COUNTRY_PLATFORMS: Record<string, { platforms: string[]; lang: string; searchSuffix: string }> = {
  JP: { platforms: ["amazon_jp", "youtube_jp", "trustpilot", "reviews_io"], lang: "ja", searchSuffix: "site:amazon.co.jp" },
  SG: { platforms: ["shopee_sg", "lazada_sg", "youtube_sg", "trustpilot"], lang: "en", searchSuffix: "site:shopee.sg OR site:lazada.sg" },
  MY: { platforms: ["shopee_my", "lazada_my", "youtube_my", "trustpilot"], lang: "ms", searchSuffix: "site:shopee.com.my OR site:lazada.com.my" },
  ID: { platforms: ["shopee_id", "lazada_id", "youtube_id", "trustpilot"], lang: "id", searchSuffix: "site:shopee.co.id OR site:lazada.co.id" },
  TH: { platforms: ["shopee_th", "lazada_th", "youtube_th", "trustpilot"], lang: "th", searchSuffix: "site:shopee.co.th OR site:lazada.co.th" },
  PH: { platforms: ["shopee_ph", "lazada_ph", "youtube_ph", "trustpilot"], lang: "en", searchSuffix: "site:shopee.ph OR site:lazada.com.ph" },
  VN: { platforms: ["shopee_vn", "lazada_vn", "youtube_vn", "trustpilot"], lang: "vi", searchSuffix: "site:shopee.vn OR site:lazada.vn" },
  TW: { platforms: ["amazon_tw", "youtube_tw", "trustpilot", "reviews_io"], lang: "zh", searchSuffix: "site:amazon.co.jp LG" },
  HK: { platforms: ["amazon_hk", "youtube_hk", "trustpilot", "reviews_io"], lang: "zh", searchSuffix: "LG review hong kong" },
  IN: { platforms: ["amazon_in", "youtube_in", "trustpilot", "complaintsboard"], lang: "en", searchSuffix: "site:amazon.in" },
  IQ: { platforms: ["complaintsboard", "trustpilot"], lang: "en", searchSuffix: "LG Iraq review" },
};

const LG_PRODUCT_CATEGORIES = [
  "TV", "OLED", "Refrigerator", "Washing Machine", "Air Conditioner",
  "Soundbar", "Monitor", "Laptop", "Dishwasher", "Dryer", "Microwave",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CollectRequest = await req.json().catch(() => ({}));
    const countries = body.countries || Object.keys(COUNTRY_PLATFORMS);
    const categories = body.categories || LG_PRODUCT_CATEGORIES;
    const maxPages = body.maxPages || 5;

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, { collected: number; errors: string[] }> = {};

    for (const country of countries) {
      const config = COUNTRY_PLATFORMS[country];
      if (!config) continue;

      results[country] = { collected: 0, errors: [] };

      for (const category of categories.slice(0, 3)) {
        try {
          // Search for LG product reviews using Firecrawl
          const searchQuery = `LG ${category} review ${country !== "JP" ? country : "Japan"}`;
          
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: maxPages,
              lang: config.lang,
              scrapeOptions: { formats: ["markdown"] },
            }),
          });

          if (!searchRes.ok) {
            const errText = await searchRes.text();
            results[country].errors.push(`Search failed for ${category}: ${errText}`);
            continue;
          }

          const searchData = await searchRes.json();
          const searchResults = searchData.data || [];

          // Extract reviews from scraped content using AI
          for (const result of searchResults) {
            if (!result.markdown || result.markdown.length < 50) continue;

            try {
              // Use Lovable AI to extract structured reviews
              const aiKey = Deno.env.get("LOVABLE_API_KEY");
              if (!aiKey) continue;

              const extractionRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${aiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    {
                      role: "system",
                      content: `You extract LG Electronics product reviews from web content. Return a JSON array of reviews. Each review must have: title (string), content (string, the review text), rating (number 1-5 or null), sentiment ("positive"|"negative"|"neutral"), sentiment_score (0.0-1.0), author (string or null), product_name (string - the LG product being reviewed). Only extract actual user reviews about LG products. Skip ads, navigation, unrelated content. If no reviews found, return empty array []. Return ONLY valid JSON array, no markdown.`,
                    },
                    {
                      role: "user",
                      content: `Extract LG product reviews from this ${country} webpage content:\n\nURL: ${result.url}\n\n${result.markdown.slice(0, 8000)}`,
                    },
                  ],
                  temperature: 0.1,
                }),
              });

              if (!extractionRes.ok) continue;

              const aiData = await extractionRes.json();
              const rawText = aiData.choices?.[0]?.message?.content || "[]";
              
              // Parse JSON from AI response
              let reviews: any[] = [];
              try {
                const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                reviews = JSON.parse(cleaned);
                if (!Array.isArray(reviews)) reviews = [];
              } catch {
                continue;
              }

              // Save reviews to DB
              for (const review of reviews) {
                if (!review.content || review.content.length < 10) continue;

                // Find or create product
                const productName = review.product_name || `LG ${category}`;
                const modelNumber = productName.toLowerCase().replace(/\s+/g, "-");

                const { data: existingProduct } = await fetch(
                  `${supabaseUrl}/rest/v1/products?model_number=eq.${encodeURIComponent(modelNumber)}&limit=1`,
                  {
                    headers: {
                      apikey: serviceKey,
                      Authorization: `Bearer ${serviceKey}`,
                    },
                  }
                ).then((r) => r.json().then((d) => ({ data: d })));

                let productId: string;
                if (existingProduct && existingProduct.length > 0) {
                  productId = existingProduct[0].id;
                } else {
                  // Create product
                  const createRes = await fetch(`${supabaseUrl}/rest/v1/products`, {
                    method: "POST",
                    headers: {
                      apikey: serviceKey,
                      Authorization: `Bearer ${serviceKey}`,
                      "Content-Type": "application/json",
                      Prefer: "return=representation",
                    },
                    body: JSON.stringify({
                      model_number: modelNumber,
                      display_name: productName,
                      category: category,
                      is_active: true,
                    }),
                  });
                  const created = await createRes.json();
                  productId = created[0]?.id;
                  if (!productId) continue;
                }

                // Determine source name
                const sourceUrl = result.url || "";
                let source = "web_review";
                if (sourceUrl.includes("shopee")) source = `shopee_${country.toLowerCase()}`;
                else if (sourceUrl.includes("lazada")) source = `lazada_${country.toLowerCase()}`;
                else if (sourceUrl.includes("amazon")) source = `amazon_${country.toLowerCase()}`;
                else if (sourceUrl.includes("trustpilot")) source = "trustpilot";
                else if (sourceUrl.includes("reviews.io")) source = "reviews_io";
                else if (sourceUrl.includes("complaintsboard")) source = "complaintsboard";
                else if (sourceUrl.includes("youtube")) source = `youtube_${country.toLowerCase()}`;
                else source = `web_review_${country.toLowerCase()}`;

                // Insert review with dedup check
                const externalId = `${source}_${btoa(review.content.slice(0, 100)).slice(0, 40)}`;

                await fetch(`${supabaseUrl}/rest/v1/reviews`, {
                  method: "POST",
                  headers: {
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                    "Content-Type": "application/json",
                    Prefer: "return=minimal",
                  },
                  body: JSON.stringify({
                    product_id: productId,
                    source,
                    content: review.content,
                    title: review.title || null,
                    rating: review.rating || null,
                    sentiment: review.sentiment || "neutral",
                    sentiment_score: review.sentiment_score || 0.5,
                    author: review.author || null,
                    source_url: sourceUrl,
                    external_id: externalId,
                    platform_type: source.split("_")[0],
                    content_type: "review",
                  }),
                });

                results[country].collected++;
              }
            } catch (innerErr) {
              results[country].errors.push(`Extract error: ${String(innerErr).slice(0, 100)}`);
            }
          }
        } catch (catErr) {
          results[country].errors.push(`Category ${category}: ${String(catErr).slice(0, 100)}`);
        }
      }
    }

    // Log collection
    const totalCollected = Object.values(results).reduce((s, r) => s + r.collected, 0);
    await fetch(`${supabaseUrl}/rest/v1/collection_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: `asian_reviews_${countries.join("_")}`,
        status: "completed",
        items_collected: totalCollected,
        completed_at: new Date().toISOString(),
      }),
    });

    return new Response(
      JSON.stringify({ success: true, results, totalCollected }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-asian-reviews error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
