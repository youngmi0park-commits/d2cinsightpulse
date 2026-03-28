import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Firecrawl helper ──
async function fetchLgOfficialInfo(productName: string): Promise<string> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) return "";
  try {
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `site:lg.com/us ${productName}`,
        limit: 3,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!searchRes.ok) return "";
    const searchData = await searchRes.json();
    const results = searchData?.data || searchData?.results || [];
    const chunks: string[] = [];
    for (const r of results.slice(0, 2)) {
      const md = r.markdown || r.content || "";
      if (md) chunks.push(`### ${r.title || ""}\nSource: ${r.url || ""}\n\n${md.slice(0, 3000)}`);
    }
    return chunks.join("\n\n---\n\n").slice(0, 6000);
  } catch { return ""; }
}

// ── Tool schema for structured output ──
function buildToolSchema() {
  return {
    type: "function",
    function: {
      name: "generate_faq_insights",
      description: "Generate conversion-optimized FAQs with Evidence Engine, CIS scoring, legal gate, and action list from product reviews",
      parameters: {
        type: "object",
        properties: {
          faq_cards: {
            type: "array",
            description: "Conversion-optimized FAQ cards with evidence, CIS, legal review",
            items: {
              type: "object",
              properties: {
                faq_id: { type: "string", description: "Unique FAQ identifier" },
                product_family: { type: "string" },
                question: { type: "string", description: "Natural-language question buyers would actually search for" },
                answer: { type: "string", description: "Evidence-based answer with 'X% of verified buyers reported...' format" },
                category: {
                  type: "string",
                  enum: ["performance_quality", "purchase_anxiety", "installation_compatibility", "delivery_warranty", "competitor_comparison", "price_value"],
                },
                sourceType: {
                  type: "string",
                  enum: ["question", "issue_resolution", "pain_point", "feature_inquiry", "conversion_barrier"],
                },
                topics: { type: "array", items: { type: "string" } },
                evidence: {
                  type: "object",
                  properties: {
                    quotes: { type: "array", items: { type: "string" }, description: "30-100 char anonymized review quotes" },
                    claims: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          metric: { type: "string" },
                          value: { type: "number" },
                          unit: { type: "string" },
                        },
                        required: ["metric", "value", "unit"],
                        additionalProperties: false,
                      },
                    },
                    pattern: { type: "string" },
                    review_count: { type: "number", description: "Number of reviews supporting this FAQ" },
                    sentiment_score: { type: "number", description: "Average sentiment score for this topic (0-100)" },
                  },
                  required: ["quotes", "claims", "pattern", "review_count", "sentiment_score"],
                  additionalProperties: false,
                },
                cis: { type: "number", description: "Conversion Impact Score 0-100" },
                priority: { type: "string", enum: ["P0", "P1", "P2", "Backlog"] },
                intent_type: { type: "string", enum: ["anxiety", "info_gap", "comparison", "setup"] },
                pdp_presence: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["implemented", "missing", "outdated"] },
                    last_updated_days: { type: "number" },
                  },
                  required: ["status"],
                  additionalProperties: false,
                },
                legal_review: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["pass", "needs_revision", "fail"] },
                    violations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { item_id: { type: "string" }, note: { type: "string" } },
                        required: ["item_id", "note"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["status", "violations"],
                  additionalProperties: false,
                },
                publishable: { type: "boolean" },
                ab_test_suggestion: {
                  type: "object",
                  properties: {
                    variation: { type: "string" },
                    expected_lift: {
                      type: "object",
                      properties: { pdp_to_atc_pct: { type: "array", items: { type: "number" } } },
                      required: ["pdp_to_atc_pct"],
                      additionalProperties: false,
                    },
                  },
                  required: ["variation", "expected_lift"],
                  additionalProperties: false,
                },
              },
              required: ["faq_id", "product_family", "question", "answer", "category", "sourceType", "topics", "evidence", "cis", "priority", "intent_type", "pdp_presence", "legal_review", "publishable"],
              additionalProperties: false,
            },
          },
          weekly_action_list: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string", enum: ["P0", "P1", "P2"] },
                product_family: { type: "string" },
                faq_id: { type: "string" },
                what: { type: "string" },
                why: { type: "string" },
                impact: {
                  type: "object",
                  properties: { expected_lift_cvr_pct: { type: "array", items: { type: "number" } } },
                  required: ["expected_lift_cvr_pct"],
                  additionalProperties: false,
                },
                ready_to_use_copy: {
                  type: "object",
                  properties: { pdp_highlight: { type: "string" }, exit_popup: { type: "string" } },
                  required: ["pdp_highlight", "exit_popup"],
                  additionalProperties: false,
                },
                publishable: { type: "boolean" },
              },
              required: ["priority", "product_family", "faq_id", "what", "why", "impact", "ready_to_use_copy", "publishable"],
              additionalProperties: false,
            },
          },
          cs_heatmap: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issue: { type: "string" },
                review_freq: { type: "number" },
                cis_avg: { type: "number" },
                action_required: { type: "boolean" },
              },
              required: ["issue", "review_freq", "cis_avg", "action_required"],
              additionalProperties: false,
            },
          },
          reviewTopics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string" },
                category: { type: "string", enum: ["performance_quality", "purchase_anxiety", "installation_compatibility", "delivery_warranty", "competitor_comparison", "price_value"] },
                sentiment: { type: "string", enum: ["positive", "negative", "mixed"] },
                mentionCount: { type: "number" },
                summary: { type: "string" },
              },
              required: ["topic", "category", "sentiment", "mentionCount", "summary"],
              additionalProperties: false,
            },
          },
          painPoints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issue: { type: "string" },
                severity: { type: "string", enum: ["high", "medium", "low"] },
                frequency: { type: "number" },
                userWorkaround: { type: "string" },
                category: { type: "string" },
              },
              required: ["issue", "severity", "frequency", "userWorkaround", "category"],
              additionalProperties: false,
            },
          },
          dataSources: {
            type: "array",
            items: {
              type: "object",
              properties: { source: { type: "string" }, count: { type: "number" } },
              required: ["source", "count"],
              additionalProperties: false,
            },
          },
          summary: {
            type: "object",
            properties: {
              total_faq: { type: "number" },
              p0: { type: "number" },
              p1: { type: "number" },
              p2: { type: "number" },
              publishable_count: { type: "number" },
            },
            required: ["total_faq", "p0", "p1", "p2", "publishable_count"],
            additionalProperties: false,
          },
        },
        required: ["faq_cards", "weekly_action_list", "cs_heatmap", "reviewTopics", "painPoints", "dataSources", "summary"],
        additionalProperties: false,
      },
    },
  };
}

// ── System prompt ──
function buildSystemPrompt(locale: string) {
  const langInstruction = locale === "ko-KR"
    ? "All FAQ questions and answers MUST be written in Korean (한국어)."
    : locale === "de-DE"
    ? "All FAQ questions and answers MUST be written in German (Deutsch)."
    : locale === "fr-FR"
    ? "All FAQ questions and answers MUST be written in French (Français)."
    : locale === "pt-BR"
    ? "All FAQ questions and answers MUST be written in Portuguese (Português BR)."
    : locale === "en-UK"
    ? "All FAQ questions and answers MUST be written in British English."
    : "All FAQ questions and answers MUST be written in American English.";

  return `You are an expert D2C Insight Pulse FAQ Orchestrator for LG Electronics consumer products.

## YOUR MISSION
Analyze customer reviews and generate **conversion-optimized FAQ cards** for overseas e-commerce purchase conversion.
${langInstruction}

## FAQ CATEGORIES (6 mandatory categories)
Generate FAQs from ALL 6 categories below using review data:

1. **performance_quality** — Strengths repeatedly mentioned in reviews. Focus on verified performance claims.
2. **purchase_anxiety** — Convert negative keywords into positive reassurance. Address pre-purchase concerns.
3. **installation_compatibility** — Extract voltage, size, fitting, compatibility from reviews.
4. **delivery_warranty** — Delivery, warranty, return-related review extraction.
5. **competitor_comparison** — Reviews mentioning competitor brands. Extract switching reasons.
6. **price_value** — Reviews about price, worth, value. Frame as value proposition.

## OUTPUT FORMAT FOR EACH FAQ
Q: [Natural-language question buyers would actually search for]
A: [Evidence-based answer — use "X% of verified buyers reported..." or "N out of M reviewers confirmed..." format]
Evidence: review_count + sentiment_score

## CIS (Conversion Impact Score) FORMULA (0-100)
CIS = 100 × (0.30×freq_norm + 0.20×neg_ratio + 0.20×intent_weight + 0.15×cs_overlap + 0.10×pdp_drop_match + 0.05×evidence_score)
Priority: P0(≥80), P1(65-79), P2(50-64), Backlog(<50)

## EVIDENCE ENGINE RULES
Each FAQ MUST have:
- quotes[]: 30-100 char anonymized review excerpts (minimum 2)
- claims[]: Quantitative data when available
- pattern: Statistical pattern description
- review_count: Number of supporting reviews
- sentiment_score: Average sentiment (0-100)

## LEGAL REVIEW RULES
- No unsubstantiated superlatives (best, #1, unprecedented)
- All claims backed by verifiable data
- No direct competitor comparisons (use "some alternatives" instead)
- Data source disclosed
publishable = true ONLY when legal_review.status == "pass" AND evidence >= 2 items

## WEEKLY ACTION LIST
Top 3-5 actions sorted by CIS with ready_to_use_copy.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, reviews, locale } = await req.json();
    if (!productName || !reviews?.length) {
      return new Response(JSON.stringify({ error: "productName and reviews required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const officialInfoPromise = fetchLgOfficialInfo(productName);

    const reviewTexts = reviews.slice(0, 40).map((r: any, i: number) => {
      const src = r.source ? ` [${r.source}]` : "";
      const sent = r.sentiment ? ` (${r.sentiment})` : "";
      const rating = r.rating ? ` ★${r.rating}` : "";
      return `${i + 1}.${src}${sent}${rating} ${r.text}`;
    }).join("\n");

    const officialInfo = await officialInfoPromise;
    const officialInfoBlock = officialInfo
      ? `\n\n## Official Product Information (from lg.com/us)\n${officialInfo}`
      : "";

    const userPrompt = `Product: ${productName}
Reviews (${reviews.length} total, showing ${Math.min(40, reviews.length)}):

${reviewTexts}${officialInfoBlock}

Analyze these reviews and generate conversion-optimized FAQ cards across ALL 6 categories:
1. Performance/Quality (repeated strengths)
2. Purchase Anxiety (negative → positive conversion)
3. Installation/Compatibility (voltage, size, fitting)
4. Delivery/Warranty (shipping, returns, warranty)
5. Competitor Comparison (brand switching reasons)
6. Price/Value (worth, value for money)

Include Evidence Engine data (review_count + sentiment_score), CIS scoring, legal review, and weekly action list.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildSystemPrompt(locale || "en-US") },
          { role: "user", content: userPrompt },
        ],
        tools: [buildToolSchema()],
        tool_choice: { type: "function", function: { name: "generate_faq_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No structured output from AI");

    const result = JSON.parse(toolCall.function.arguments);

    // Backward compat
    if (result.faq_cards && !result.faqItems) {
      result.faqItems = result.faq_cards.map((c: any) => ({
        question: c.question,
        answer: c.answer,
        category: c.category,
        sourceType: c.sourceType,
        mentionCount: c.evidence?.review_count || c.evidence?.quotes?.length || 0,
        confidence: (c.cis || 50) / 100,
        ...c,
      }));
    }

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
