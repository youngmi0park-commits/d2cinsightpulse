import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { country, range } = await req.json().catch(() => ({ country: "all", range: "weekly" }));
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Build query for non-lgcom, non-reddit reviews
    let query = sb
      .from("reviews")
      .select("source, sentiment, content, product_id, products!inner(display_name, category)")
      .not("source", "like", "lge_com%")
      .not("source", "like", "reddit%")
      .limit(2000);

    // Apply weekly filter unless "all" range requested
    if (range !== "all") {
      query = query.gte("published_at", new Date(Date.now() - 7 * 86400000).toISOString());
    }

    // Apply country filter if specified
    if (country && country !== "all") {
      const suffix = "_" + country.toLowerCase();
      query = query.like("source", "%" + suffix);
    }

    const { data: reviews, error } = await query;
    if (error) throw error;
    if (!reviews || reviews.length === 0) {
      return new Response(JSON.stringify({ channels: [], totalReviews: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize source to channel label
    function channelLabel(src: string): string {
      if (src.startsWith("amazon")) return "Amazon";
      if (src.startsWith("youtube")) return "YouTube";
      if (src.startsWith("bestbuy")) return "Best Buy";
      if (src.startsWith("walmart")) return "Walmart";
      if (src.startsWith("shopee")) return "Shopee";
      if (src.startsWith("lazada")) return "Lazada";
      if (src.startsWith("trustpilot")) return "Trustpilot";
      if (src.startsWith("reviews_io")) return "Reviews.io";
      if (src.startsWith("complaintsboard")) return "ComplaintsBoard";
      return src.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    }

    // Group by normalized channel
    const byChannel: Record<string, typeof reviews> = {};
    for (const r of reviews) {
      const ch = channelLabel(r.source);
      if (!byChannel[ch]) byChannel[ch] = [];
      byChannel[ch].push(r);
    }

    // For each channel, prepare product summaries
    const channelSummaries: { channel: string; reviewCount: number; productSummary: string }[] = [];

    for (const [channel, rows] of Object.entries(byChannel)) {
      const byProduct: Record<string, { name: string; category: string; positive: string[]; negative: string[]; total: number }> = {};
      for (const r of rows) {
        const p = r.products as any;
        const name = p?.display_name || "Unknown";
        const cat = p?.category || "";
        if (!byProduct[name]) byProduct[name] = { name, category: cat, positive: [], negative: [], total: 0 };
        byProduct[name].total++;
        if (r.sentiment === "positive" && byProduct[name].positive.length < 15) {
          byProduct[name].positive.push(r.content.slice(0, 200));
        }
        if (r.sentiment === "negative" && byProduct[name].negative.length < 15) {
          byProduct[name].negative.push(r.content.slice(0, 200));
        }
      }

      const top3 = Object.values(byProduct)
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      if (top3.length === 0) continue;

      const parts: string[] = [];
      for (let i = 0; i < top3.length; i++) {
        const p = top3[i];
        parts.push(
          "Product " + (i + 1) + ": " + p.name + " (" + p.category + ") — " + p.total + " mentions\n" +
          "Positive samples (" + p.positive.length + "):\n" +
          p.positive.map((s) => "- " + s).join("\n") + "\n" +
          "Negative samples (" + p.negative.length + "):\n" +
          p.negative.map((s) => "- " + s).join("\n")
        );
      }

      channelSummaries.push({ channel, reviewCount: rows.length, productSummary: parts.join("\n\n") });
    }

    if (channelSummaries.length === 0) {
      return new Response(JSON.stringify({ channels: [], totalReviews: reviews.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build channel data string (avoid nested template literals)
    const channelDataStr = channelSummaries.map((cs) =>
      "\n=== Channel: " + cs.channel + " (" + cs.reviewCount + " reviews) ===\n" + cs.productSummary
    ).join("\n");

    // Call AI for insight generation (Korean output)
    const prompt = "You are a marketing insight AI for LG Electronics products generating weekly community intelligence.\n" +
      "ALL OUTPUT MUST BE IN KOREAN (한국어).\n\n" +
      "CRITICAL RULES:\n" +
      "1. Generate \"executiveSummary\" — exactly 4 objects, each with \"category\" (제품 카테고리 e.g. TV, 세탁기, 냉장고, 가전 전체) and \"insight\" (한국어 문장):\n" +
      "   Item 1: 전체 모멘텀 요약 (category: '전체')\n" +
      "   Item 2: 가장 주목받는 제품/카테고리 (category: 해당 카테고리명)\n" +
      "   Item 3: 이번 주 핵심 긍정 경험 테마 (category: 해당 카테고리명)\n" +
      "   Item 4: 반복되는 마찰/리스크 시그널 (category: 해당 카테고리명)\n" +
      "2. Generate \"keyTakeaway\" — ONE actionable Korean sentence: 마케터가 이번 주 바로 활용할 수 있는 핵심 인사이트/액션 포인트\n" +
      "3. For each channel, identify the Top 3 most-mentioned products\n" +
      "4. For each product: ONE positive insight sentence + ONE negative insight sentence (ALL IN KOREAN)\n" +
      "5. Insights must reference product function (화질, 게이밍, 사운드, 스마트/AI, 디자인, 설치, 신뢰성, 가성비), usage context, and outcome\n" +
      "6. Add a \"This Week's Takeaway\" per channel in KOREAN (momentum + friction)\n" +
      "7. Competitor names: Samsung → SS, Sony → SN, TCL → TC, Hisense → HS\n" +
      "8. No keyword-only output, no raw quotes, no generic praise\n\n" +
      channelDataStr + "\n\n" +
      "Output MUST be valid JSON:\n" +
      "{\n" +
      "  \"executiveSummary\": [{\"category\":\"전체\",\"insight\":\"...\"},{\"category\":\"TV\",\"insight\":\"...\"},{\"category\":\"세탁기\",\"insight\":\"...\"},{\"category\":\"TV\",\"insight\":\"...\"}],\n" +
      "  \"keyTakeaway\": \"마케터를 위한 핵심 액션 포인트 한 문장\",\n" +
      "  \"channels\": [\n" +
      "    {\n" +
      "      \"channel\": \"Channel Name\",\n" +
      "      \"reviewCount\": 123,\n" +
      "      \"products\": [{\"rank\":1,\"name\":\"Product Name\",\"category\":\"TV\",\"mentions\":45,\"positiveInsight\":\"한국어 긍정 인사이트\",\"negativeInsight\":\"한국어 부정 인사이트\"}],\n" +
      "      \"takeaway\": {\"momentum\":\"한국어 모멘텀 문장\",\"friction\":\"한국어 마찰점 문장\"}\n" +
      "    }\n" +
      "  ]\n" +
      "}";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a marketing insight generator. Output valid JSON only. ALL text must be in Korean." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error("AI API error: " + aiResp.status + " — " + errText);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    const insights = JSON.parse(content);

    return new Response(JSON.stringify({ ...insights, totalReviews: reviews.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-community-insights error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
