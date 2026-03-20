import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Try to fetch official product info from LG USA via Firecrawl search + scrape.
 * Returns markdown string or empty string on failure.
 */
async function fetchLgOfficialInfo(productName: string): Promise<string> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.warn("FIRECRAWL_API_KEY not set — skipping official product info lookup");
    return "";
  }

  try {
    // Step 1: Search LG USA site for the product
    const searchQuery = `site:lg.com/us ${productName}`;
    console.log("Firecrawl search:", searchQuery);

    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });

    if (!searchRes.ok) {
      console.warn("Firecrawl search failed:", searchRes.status);
      return "";
    }

    const searchData = await searchRes.json();
    const results = searchData?.data || searchData?.results || [];

    if (!results.length) {
      console.log("No LG USA results found for:", productName);
      return "";
    }

    // Collect markdown from search results (already scraped via scrapeOptions)
    const chunks: string[] = [];
    for (const result of results.slice(0, 2)) {
      const md = result.markdown || result.content || "";
      const title = result.title || result.metadata?.title || "";
      const url = result.url || result.metadata?.sourceURL || "";
      if (md) {
        chunks.push(`### ${title}\nSource: ${url}\n\n${md.slice(0, 3000)}`);
      }
    }

    if (chunks.length === 0) {
      console.log("No markdown content from LG search results");
      return "";
    }

    const combined = chunks.join("\n\n---\n\n");
    console.log(`Fetched ${combined.length} chars of official LG product info`);
    return combined.slice(0, 6000); // cap to avoid token overflow
  } catch (err) {
    console.warn("Error fetching LG official info:", err);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, reviews } = await req.json();

    if (!productName || !reviews?.length) {
      return new Response(JSON.stringify({ error: "productName and reviews required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch official LG product info in parallel with review preparation
    const officialInfoPromise = fetchLgOfficialInfo(productName);

    // Prepare a compact review summary (limit to 40 reviews to stay within token limits)
    const reviewTexts = reviews.slice(0, 40).map((r: any, i: number) => {
      const src = r.source ? ` [${r.source}]` : "";
      const sent = r.sentiment ? ` (${r.sentiment})` : "";
      return `${i + 1}.${src}${sent} ${r.text}`;
    }).join("\n");

    const officialInfo = await officialInfoPromise;

    const officialInfoBlock = officialInfo
      ? `\n\n## Official Product Information (from lg.com/us)\nUse this official data to supplement and verify FAQ answers. Prefer official specs over user claims when they conflict.\n\n${officialInfo}`
      : "";

    const systemPrompt = `You are an expert product analyst for consumer electronics. Analyze the provided customer reviews and generate structured FAQ and insights data.

IMPORTANT RULES:
- All output must be in English
- Extract REAL questions and pain points from the reviews — do NOT fabricate
- Merge duplicate/similar questions into single FAQ items
- Categorize every FAQ into exactly one category
- Be specific to the product — reference actual features mentioned in reviews
- When official product information from lg.com is provided, USE IT to enrich and verify your FAQ answers with accurate specs, features, and official guidance
- Combine real user experiences with official product data for comprehensive answers`;

    const userPrompt = `Product: ${productName}
Reviews (${reviews.length} total, showing ${Math.min(40, reviews.length)}):

${reviewTexts}${officialInfoBlock}

Analyze these reviews and return structured JSON with tool calling.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_faq_insights",
              description: "Generate categorized FAQs, review topics, and pain points from product reviews",
              parameters: {
                type: "object",
                properties: {
                  faqItems: {
                    type: "array",
                    description: "FAQ items extracted and generated from reviews",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string", description: "The FAQ question" },
                        answer: { type: "string", description: "Answer based on review experiences and official product specs" },
                        category: {
                          type: "string",
                          enum: ["installation", "initial_setup", "display_sound", "connectivity", "usability", "compatibility", "features", "pricing", "reliability", "other"],
                          description: "FAQ category",
                        },
                        sourceType: {
                          type: "string",
                          enum: ["question", "issue_resolution", "pain_point", "feature_inquiry"],
                          description: "How this FAQ was derived",
                        },
                        mentionCount: { type: "number", description: "Estimated number of reviews mentioning this topic" },
                        confidence: { type: "number", description: "Confidence score 0-1 of relevance" },
                      },
                      required: ["question", "answer", "category", "sourceType", "mentionCount", "confidence"],
                      additionalProperties: false,
                    },
                  },
                  reviewTopics: {
                    type: "array",
                    description: "Key review topics for this product",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string", description: "Topic name" },
                        category: {
                          type: "string",
                          enum: ["installation", "compatibility", "usability", "feature_issue", "improvement_request", "praise"],
                        },
                        sentiment: { type: "string", enum: ["positive", "negative", "mixed"] },
                        mentionCount: { type: "number" },
                        summary: { type: "string", description: "Brief summary of what reviewers say about this topic" },
                      },
                      required: ["topic", "category", "sentiment", "mentionCount", "summary"],
                      additionalProperties: false,
                    },
                  },
                  painPoints: {
                    type: "array",
                    description: "Frequently mentioned pain points",
                    items: {
                      type: "object",
                      properties: {
                        issue: { type: "string", description: "The pain point" },
                        severity: { type: "string", enum: ["high", "medium", "low"] },
                        frequency: { type: "number", description: "How many reviews mention this" },
                        userWorkaround: { type: "string", description: "Any workaround users found, or empty string" },
                        category: { type: "string" },
                      },
                      required: ["issue", "severity", "frequency", "userWorkaround", "category"],
                      additionalProperties: false,
                    },
                  },
                  dataSources: {
                    type: "array",
                    description: "Summary of review sources analyzed",
                    items: {
                      type: "object",
                      properties: {
                        source: { type: "string" },
                        count: { type: "number" },
                      },
                      required: ["source", "count"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["faqItems", "reviewTopics", "painPoints", "dataSources"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_faq_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-faq error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
