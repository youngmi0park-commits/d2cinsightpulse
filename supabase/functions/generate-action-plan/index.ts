import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a senior digital marketing strategist for LG Electronics. You analyze user reviews and produce actionable marketing action plans.

🎯 COPY-WRITING RULE (CRITICAL):
- MINIMIZE explicit product/model name mentions in all generated copy (headlines, taglines, ad copy, FAQ answers, channel actions, hero copy, etc.).
- Mention the full product/model name AT MOST ONCE per asset (only when absolutely necessary for clarity, e.g. legal disclosure or first hero line).
- Lead with USER BENEFITS, EMOTIONAL HOOKS, JOBS-TO-BE-DONE, and PROOF POINTS — not with the product name.
- Prefer pronouns/category words ("it", "this OLED", "your fridge", "the soundbar") or pure benefit framing ("Brighter blacks. Louder silence.") instead of repeating the model name.
- The persuasion must come from the strength/value/transformation, not from name recall.

Given the product info + review analysis data, output a JSON object with the following structure (all text in English):

{
  "summary": {
    "positiveRatio": number (0-100),
    "negativeRatio": number (0-100),
    "neutralRatio": number (0-100),
    "topPositiveKeywords": string[],
    "topNegativeKeywords": string[],
    "consumerIntents": string[],  // search intents extracted from reviews
    "longTailKeywords": string[]  // long-tail keywords consumers would use
  },
  "channelStrategies": [
    {
      "channel": string,  // e.g. "PMAX & Search Ads", "UGC & Experience Campaign", "Instagram", "TikTok/Reels", "Influencer Collaboration", "ORM & Crisis Management", "B2B & Niche Market", "Dotcom Performance Marketing", "Brand Marketing"
      "activity": string,  // concise activity name
      "detail": string,  // detailed execution plan (2-4 sentences)
      "expectedEffect": string,  // expected outcomes
      "priority": "high" | "medium" | "low"
    }
  ],
  "top3Actions": [
    {
      "rank": number,
      "action": string,
      "reason": string,
      "kpi": string
    }
  ],
  "dotcomStrategy": {
    "performanceMarketing": string,  // specific performance marketing tactics for dotcom
    "brandMarketing": string,  // brand marketing approach
    "landingPageSuggestion": string  // landing page optimization ideas
  },
  "ugcGuidelines": {
    "aestheticElements": string[],  // visual/aesthetic elements reviewers love
    "beforeAfterPoints": string[],  // transformation points for UGC
    "contentFormats": string[]  // recommended content formats
  }
}

Focus on:
1. Extract pain points AND enthusiasm points from reviews
2. Consumer search intents and long-tail keywords
3. PMAX/PPC asset directions using real user language
4. UGC/experience campaign guidelines based on aesthetic elements
5. Social media visual concepts (Instagram lifestyle, TikTok challenges)
6. Influencer type recommendations (technical RTings-style vs lifestyle Lemon8-style)
7. ORM crisis management for negative reviews
8. B2B/niche market opportunities if detected
9. Dotcom-specific performance and brand marketing strategies

Be specific with actual copy directions, not generic advice. Reference actual review language.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, category, sentimentData, reviewSamples } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `Product: ${productName}
Category: ${category}

Sentiment Analysis:
- Positive: ${sentimentData.positive} reviews
- Negative: ${sentimentData.negative} reviews  
- Neutral: ${sentimentData.neutral} reviews
- Average Score: ${(sentimentData.averageScore * 100).toFixed(0)}%
- Top Positive Keywords: ${sentimentData.keywords?.positive?.join(", ") || "N/A"}
- Top Negative Keywords: ${sentimentData.keywords?.negative?.join(", ") || "N/A"}
- Compound Phrases: ${sentimentData.phrases?.slice(0, 10).join(", ") || "N/A"}
- Usage Scenes: ${sentimentData.usageScenes?.join(", ") || "N/A"}
- User Tips: ${sentimentData.userTips?.join(", ") || "N/A"}
- Durability Insights: ${sentimentData.durabilityInsights?.join(", ") || "N/A"}

Sample Reviews (${reviewSamples?.length || 0} of total):
${(reviewSamples || []).map((r: any, i: number) => `${i + 1}. [${r.sentiment || "unknown"}] ${r.content?.slice(0, 200)}`).join("\n")}

Generate a comprehensive digital marketing action plan based on this review data.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_action_plan",
              description: "Generate a structured marketing action plan from review analysis",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "object",
                    properties: {
                      positiveRatio: { type: "number" },
                      negativeRatio: { type: "number" },
                      neutralRatio: { type: "number" },
                      topPositiveKeywords: { type: "array", items: { type: "string" } },
                      topNegativeKeywords: { type: "array", items: { type: "string" } },
                      consumerIntents: { type: "array", items: { type: "string" } },
                      longTailKeywords: { type: "array", items: { type: "string" } },
                    },
                    required: ["positiveRatio", "negativeRatio", "neutralRatio", "topPositiveKeywords", "topNegativeKeywords", "consumerIntents", "longTailKeywords"],
                  },
                  channelStrategies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        channel: { type: "string" },
                        activity: { type: "string" },
                        detail: { type: "string" },
                        expectedEffect: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["channel", "activity", "detail", "expectedEffect", "priority"],
                    },
                  },
                  top3Actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rank: { type: "number" },
                        action: { type: "string" },
                        reason: { type: "string" },
                        kpi: { type: "string" },
                      },
                      required: ["rank", "action", "reason", "kpi"],
                    },
                  },
                  dotcomStrategy: {
                    type: "object",
                    properties: {
                      performanceMarketing: { type: "string" },
                      brandMarketing: { type: "string" },
                      landingPageSuggestion: { type: "string" },
                    },
                    required: ["performanceMarketing", "brandMarketing", "landingPageSuggestion"],
                  },
                  ugcGuidelines: {
                    type: "object",
                    properties: {
                      aestheticElements: { type: "array", items: { type: "string" } },
                      beforeAfterPoints: { type: "array", items: { type: "string" } },
                      contentFormats: { type: "array", items: { type: "string" } },
                    },
                    required: ["aestheticElements", "beforeAfterPoints", "contentFormats"],
                  },
                },
                required: ["summary", "channelStrategies", "top3Actions", "dotcomStrategy", "ugcGuidelines"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_action_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const result = await response.json();
    
    // Extract tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const actionPlan = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
      
      return new Response(JSON.stringify({ actionPlan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content directly
    const content = result.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({ actionPlan: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("No valid response from AI");
  } catch (e) {
    console.error("generate-action-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
