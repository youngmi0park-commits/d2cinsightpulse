const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CollectRequest {
  countries?: string[];
  categories?: string[];
  maxPages?: number;
}

const COUNTRY_CONFIG: Record<string, { lang: string; searchTerms: string[] }> = {
  JP: { lang: "ja", searchTerms: ["LG TV review Japan", "LG OLED レビュー", "LG 冷蔵庫 レビュー", "LG gram レビュー", "LG 洗濯機 レビュー"] },
  SG: { lang: "en", searchTerms: ["LG TV review Singapore", "LG OLED review Singapore shopee", "LG refrigerator Singapore lazada", "LG washing machine review SG"] },
  MY: { lang: "ms", searchTerms: ["LG TV review Malaysia", "LG OLED review Malaysia shopee", "LG peti sejuk review Malaysia", "LG mesin basuh review"] },
  ID: { lang: "id", searchTerms: ["LG TV review Indonesia", "LG OLED review Indonesia", "LG kulkas review Indonesia shopee", "LG mesin cuci review"] },
  TH: { lang: "th", searchTerms: ["LG TV review Thailand", "LG OLED รีวิว", "LG ตู้เย็น รีวิว", "LG เครื่องซักผ้า รีวิว"] },
  PH: { lang: "en", searchTerms: ["LG TV review Philippines", "LG OLED review Philippines shopee", "LG refrigerator Philippines lazada", "LG washing machine PH"] },
  VN: { lang: "vi", searchTerms: ["LG TV review Vietnam", "LG OLED đánh giá", "LG tủ lạnh đánh giá shopee", "LG máy giặt đánh giá"] },
  TW: { lang: "zh", searchTerms: ["LG TV review Taiwan", "LG OLED 評價 台灣", "LG 冰箱 評價", "LG 洗衣機 評價"] },
  HK: { lang: "zh", searchTerms: ["LG TV review Hong Kong", "LG OLED 評價 香港", "LG 雪櫃 評價"] },
  IN: { lang: "en", searchTerms: ["LG TV review India", "LG OLED review India amazon", "LG refrigerator review India", "LG washing machine India"] },
  // ── 신규 확장: 전국가/전채널 강화 ──
  KR: { lang: "ko", searchTerms: ["LG TV 후기 다나와", "LG 트롬 세탁기 후기", "LG 디오스 냉장고 후기", "LG 그램 후기 클리앙"] },
  AE: { lang: "en", searchTerms: ["LG TV review UAE noon", "LG refrigerator review Dubai", "LG washing machine review UAE amazon.ae"] },
  SA: { lang: "ar", searchTerms: ["LG تلفزيون مراجعة", "LG ثلاجة مراجعة السعودية", "LG غسالة مراجعة"] },
  TR: { lang: "tr", searchTerms: ["LG TV inceleme şikayetvar", "LG buzdolabı yorum hepsiburada", "LG çamaşır makinesi inceleme trendyol"] },
  MX: { lang: "es", searchTerms: ["LG TV reseña México mercadolibre", "LG refrigerador opiniones México", "LG lavadora reseña amazon.com.mx"] },
  BR: { lang: "pt", searchTerms: ["LG TV avaliação Brasil mercadolivre", "LG geladeira avaliação amazon.com.br", "LG máquina lavar avaliação"] },
  FR: { lang: "fr", searchTerms: ["LG TV avis fnac", "LG réfrigérateur avis darty", "LG lave-linge avis boulanger"] },
  IT: { lang: "it", searchTerms: ["LG TV recensione mediaworld", "LG frigorifero recensione unieuro", "LG lavatrice recensione amazon.it"] },
  ES: { lang: "es", searchTerms: ["LG TV opiniones mediamarkt", "LG nevera opiniones elcorteingles", "LG lavadora opiniones amazon.es"] },
  NL: { lang: "nl", searchTerms: ["LG TV review tweakers", "LG koelkast review coolblue", "LG wasmachine review bol.com"] },
  CA: { lang: "en", searchTerms: ["LG TV review Canada bestbuy.ca", "LG refrigerator review Canada", "LG washer review Canada amazon.ca"] },
  GB: { lang: "en", searchTerms: ["LG TV review UK trustedreviews", "LG refrigerator review UK currys", "LG washing machine UK johnlewis"] },
};

const LG_CATEGORIES = ["TV", "OLED", "Refrigerator", "Washing Machine", "Air Conditioner", "Soundbar", "Monitor", "Laptop", "Dishwasher"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CollectRequest = await req.json().catch(() => ({}));
    const countries = body.countries || Object.keys(COUNTRY_CONFIG);
    const maxPages = body.maxPages || 3;

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!firecrawlKey || !aiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing API keys" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, { collected: number; errors: string[] }> = {};

    for (const country of countries) {
      const config = COUNTRY_CONFIG[country];
      if (!config) continue;

      results[country] = { collected: 0, errors: [] };

      // Use country-specific search terms (limit to avoid timeout)
      const terms = config.searchTerms.slice(0, maxPages);

      for (const searchQuery of terms) {
        try {
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: 3,
              lang: config.lang,
              scrapeOptions: { formats: ["markdown"] },
            }),
          });

          if (!searchRes.ok) {
            results[country].errors.push(`Search failed: ${searchQuery}`);
            continue;
          }

          const searchData = await searchRes.json();
          const searchResults = searchData.data || [];

          for (const result of searchResults) {
            if (!result.markdown || result.markdown.length < 100) continue;

            try {
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
                      content: `You extract LG Electronics product reviews from web content. Return a JSON array of reviews. Each review object must have:
- title (string, brief summary in Korean)
- content (string, Korean translation of the review - always translate to Korean)
- rating (number 1-5 or null)
- sentiment ("positive"|"negative"|"neutral")
- sentiment_score (0.0-1.0)
- author (string, anonymized - first char + "***")
- product_name (string, the LG product name)
- category (string, one of: TV, OLED TV, QNED TV, Refrigerator, Washing Machine, Air Conditioner, Soundbar, Monitor, Laptop, Dishwasher, Dryer, Vacuum, Air Purifier)

Only extract actual user reviews about LG products. Skip ads, navigation, unrelated content.
Always translate review content to Korean.
Remove any PII (emails, phone numbers, addresses).
If no LG reviews found, return empty array [].
Return ONLY valid JSON array, no markdown.`,
                    },
                    {
                      role: "user",
                      content: `Extract LG product reviews from this ${country} webpage:\n\nURL: ${result.url}\n\n${result.markdown.slice(0, 6000)}`,
                    },
                  ],
                  temperature: 0.1,
                }),
              });

              if (!extractionRes.ok) continue;

              const aiData = await extractionRes.json();
              const rawText = aiData.choices?.[0]?.message?.content || "[]";

              let reviews: any[] = [];
              try {
                const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                reviews = JSON.parse(cleaned);
                if (!Array.isArray(reviews)) reviews = [];
              } catch {
                continue;
              }

              for (const review of reviews) {
                if (!review.content || review.content.length < 15) continue;

                // Find or create product
                const productName = review.product_name || "LG Product";
                const modelNumber = productName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50);

                const productsRes = await fetch(
                  `${supabaseUrl}/rest/v1/products?model_number=eq.${encodeURIComponent(modelNumber)}&limit=1`,
                  { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
                );
                const existingProducts = await productsRes.json();

                let productId: string;
                if (existingProducts?.length > 0) {
                  productId = existingProducts[0].id;
                } else {
                  const createRes = await fetch(`${supabaseUrl}/rest/v1/products`, {
                    method: "POST",
                    headers: {
                      apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
                      "Content-Type": "application/json", Prefer: "return=representation",
                    },
                    body: JSON.stringify({
                      model_number: modelNumber,
                      display_name: productName,
                      category: review.category || "TV",
                      is_active: true,
                    }),
                  });
                  const created = await createRes.json();
                  productId = created[0]?.id;
                  if (!productId) continue;
                }

                // Determine source
                const sourceUrl = result.url || "";
                let source = `web_review_${country.toLowerCase()}`;
                if (sourceUrl.includes("shopee")) source = `shopee_${country.toLowerCase()}`;
                else if (sourceUrl.includes("lazada")) source = `lazada_${country.toLowerCase()}`;
                else if (sourceUrl.includes("amazon")) source = `amazon_${country.toLowerCase()}`;
                else if (sourceUrl.includes("youtube")) source = `youtube_${country.toLowerCase()}`;
                else if (sourceUrl.includes("trustpilot")) source = "trustpilot";
                else if (sourceUrl.includes("reviews.io")) source = "reviews_io";

                // Dedup
                // Create hash-based external ID (handles non-ASCII)
                const encoder = new TextEncoder();
                const data = encoder.encode(`${source}:${review.content.slice(0, 100)}`);
                const hashBuffer = await crypto.subtle.digest("SHA-256", data);
                const hashArr = Array.from(new Uint8Array(hashBuffer));
                const externalId = `${source}_${hashArr.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32)}`;

                const dupCheck = await fetch(
                  `${supabaseUrl}/rest/v1/reviews?external_id=eq.${encodeURIComponent(externalId)}&limit=1`,
                  { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
                );
                const dups = await dupCheck.json();
                if (dups?.length > 0) continue;

                await fetch(`${supabaseUrl}/rest/v1/reviews`, {
                  method: "POST",
                  headers: {
                    apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
                    "Content-Type": "application/json", Prefer: "return=minimal",
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
              results[country].errors.push(`Extract: ${String(innerErr).slice(0, 80)}`);
            }
          }
        } catch (searchErr) {
          results[country].errors.push(`Search: ${String(searchErr).slice(0, 80)}`);
        }
      }
    }

    // Log
    const totalCollected = Object.values(results).reduce((s, r) => s + r.collected, 0);
    await fetch(`${supabaseUrl}/rest/v1/collection_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: `asian_reviews`,
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
