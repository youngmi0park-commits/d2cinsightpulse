import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a Vision Quality Analyst for LG Electronics product reviews.
You will receive 1-3 customer-submitted photos. Analyze them and return STRICT JSON only.

Inspect for:
1. product_condition: damaged, defective, normal, unclear
2. damage_signals: array of short tags (e.g. "scratch on door", "dent on panel", "broken hinge", "leaking water", "burnt smell hint", "dead pixel", "bent frame")
3. installation_quality: proper, improper, unclear (mounting, leveling, ventilation, cabling)
4. installation_signals: array of short tags (e.g. "uneven leveling", "blocked vent", "cable tension", "wall too thin", "no anti-tip strap")
5. environment: short description of where the product sits (kitchen, living room, garage, small apartment, dorm, outdoor patio, etc.)
6. ambient_clues: array (lighting, room size hint, other appliances visible, kids/pets present, climate hint)
7. visible_model_hint: model number or product name visible in the photo, else null
8. confidence: 0.0–1.0
9. action_required: "urgent_qc_review" | "follow_up" | "none"
10. summary_ko: one Korean sentence (≤60자) suitable for the marketing dashboard

CRITICAL:
- NEVER include personal data (faces, license plates, addresses, names). If detected, set "pii_detected": true and DO NOT describe them.
- Do NOT mention competitor brand names; mask Samsung as "SS", Sony as "SN", TCL/Hisense/Vizio as "C브랜드".
- Output ONLY a single JSON object. No markdown, no commentary.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { review_id, image_urls } = await req.json();
    if (!review_id || !Array.isArray(image_urls) || image_urls.length === 0) {
      return new Response(JSON.stringify({ error: "review_id and image_urls[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    await supabase.from("reviews").update({ media_analysis_status: "processing" }).eq("id", review_id);

    // Limit to first 3 images for cost control
    const imgs = image_urls.slice(0, 3);
    const userContent: any[] = [
      { type: "text", text: "Analyze the attached LG product review photo(s). Return JSON only." },
      ...imgs.map((url: string) => ({ type: "image_url", image_url: { url } })),
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("Vision AI error:", aiResp.status, t);
      await supabase.from("reviews").update({
        media_analysis_status: "failed",
        multimodal_analysis: { error: `AI ${aiResp.status}`, at: new Date().toISOString() },
      }).eq("id", review_id);
      const status = aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: "AI gateway error", status }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { error: "parse_failed", raw }; }

    parsed.analyzer = "lovable-ai/gemini-2.5-pro";
    parsed.analyzed_at = new Date().toISOString();
    parsed.modality = "photo";

    await supabase.from("reviews").update({
      multimodal_analysis: parsed,
      multimodal_analyzed_at: parsed.analyzed_at,
      media_analysis_status: "done",
    }).eq("id", review_id);

    return new Response(JSON.stringify({ ok: true, analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-photo-review error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});