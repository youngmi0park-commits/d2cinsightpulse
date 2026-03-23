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
                faq_id: { type: "string", description: "Unique FAQ identifier e.g. auto-c4-burnin-001" },
                product_family: { type: "string", description: "e.g. TV_OLED, UltraGear, HomeAppliances_WM" },
                question: { type: "string", description: "Customer-language FAQ question" },
                answer: { type: "string", description: "Fact-based 2-3 sentence answer, no exaggeration" },
                category: {
                  type: "string",
                  enum: ["installation", "initial_setup", "display_sound", "connectivity", "usability", "compatibility", "features", "pricing", "reliability", "other"],
                },
                sourceType: {
                  type: "string",
                  enum: ["question", "issue_resolution", "pain_point", "feature_inquiry", "conversion_barrier"],
                },
                topics: {
                  type: "array",
                  items: { type: "string" },
                  description: "Multi-select topic tags: picture_quality, brightness, uniformity, response_time, noise, energy_saving, installation, burn_in, etc."
                },
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
                    pattern: { type: "string", description: "e.g. 'Last 6 months: 14% of reviews mention overshoot'" },
                  },
                  required: ["quotes", "claims", "pattern"],
                  additionalProperties: false,
                },
                cis: { type: "number", description: "Conversion Impact Score 0-100" },
                priority: { type: "string", enum: ["P0", "P1", "P2", "Backlog"] },
                intent_type: { type: "string", enum: ["anxiety", "info_gap", "comparison", "setup"], description: "Conversion barrier type" },
                pdp_presence: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["implemented", "missing", "outdated"] },
                    last_updated_days: { type: "number", description: "Days since last PDP update, null if unknown" },
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
                        properties: {
                          item_id: { type: "string" },
                          note: { type: "string" },
                        },
                        required: ["item_id", "note"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["status", "violations"],
                  additionalProperties: false,
                },
                publishable: { type: "boolean", description: "true only if legal pass AND evidence >= 2 quotes/claims" },
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
            description: "Top priority actions sorted by CIS",
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
                  properties: {
                    pdp_highlight: { type: "string" },
                    exit_popup: { type: "string" },
                  },
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
            description: "Issue x frequency matrix",
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
                category: { type: "string", enum: ["installation", "compatibility", "usability", "feature_issue", "improvement_request", "praise"] },
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
function buildSystemPrompt() {
  return `You are an expert D2C Insight Pulse FAQ Orchestrator for LG Electronics consumer products.

## YOUR MISSION
Analyze customer reviews and generate **conversion-optimized FAQ cards** with full evidence, scoring, and legal review.

## CIS (Conversion Impact Score) FORMULA (0-100)
CIS = 100 × (0.30×freq_norm + 0.20×neg_ratio + 0.20×intent_weight + 0.15×cs_overlap + 0.10×pdp_drop_match + 0.05×evidence_score)

- freq_norm: How often this issue appears in reviews (0-1)
- neg_ratio: Negative sentiment ratio for this topic (0-1)
- intent_weight: anxiety=1.0, info_gap=0.8, comparison=0.7, setup=0.6
- cs_overlap: Estimate if this would generate CS tickets (0-1)
- pdp_drop_match: Would this FAQ reduce PDP exit rate? (0/1)
- evidence_score: Quality of supporting evidence (0-1)

Priority: P0(≥80), P1(65-79), P2(50-64), Backlog(<50)

## EVIDENCE ENGINE RULES
Each FAQ MUST have:
- quotes[]: 30-100 char anonymized review excerpts (minimum 2)
- claims[]: Quantitative data (nits/dB/Hz/ms/min etc.) when available
- pattern: "Last N months: X% of reviews mention [topic]" with methodology note

## LEGAL REVIEW RULES (LGE Ad Compliance Checklist)
Apply these checks to each FAQ:
- No unsubstantiated superlatives (best, #1, unprecedented)
- All factual claims backed by verifiable data
- No direct competitor comparisons (use "some alternatives" instead)
- No misleading content
- Data source disclosed
- Genuine user-generated content only
- No unauthorized third-party IP

legal_review.status:
- "pass": All checks clear
- "needs_revision": Minor issues fixable with edits
- "fail": Cannot be published

## PUBLISHABLE RULE
publishable = true ONLY when:
1. legal_review.status == "pass"
2. evidence has >= 2 items (quotes + claims combined)

## FAQ GENERATION RULES
- Extract questions from: direct questions, repeated issues, conversion barriers (anxiety, info gaps, comparisons, setup concerns)
- Answers: fact-based 2-3 sentences, specify conditions, NO exaggeration
- Use customer language, not marketing speak
- Topics: multi-select from predefined list

## WEEKLY ACTION LIST
Generate top 3-5 actions sorted by CIS, each with:
- what/why/impact
- ready_to_use_copy: pdp_highlight + exit_popup text

## OUTPUT
Return structured JSON via tool calling. All output in English.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, reviews } = await req.json();
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

Analyze these reviews and generate conversion-optimized FAQ cards with Evidence, CIS scoring, legal review, and weekly action list.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildSystemPrompt() },
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

    // Backward compat: map faq_cards → faqItems for existing UI
    if (result.faq_cards && !result.faqItems) {
      result.faqItems = result.faq_cards.map((c: any) => ({
        question: c.question,
        answer: c.answer,
        category: c.category,
        sourceType: c.sourceType,
        mentionCount: c.evidence?.quotes?.length || 0,
        confidence: (c.cis || 50) / 100,
        // Enhanced fields pass through
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
