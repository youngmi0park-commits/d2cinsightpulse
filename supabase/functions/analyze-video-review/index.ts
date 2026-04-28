import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a Video Review Analyst for LG Electronics products.
You receive (a) a YouTube video transcript with timestamps and (b) optional top viewer comments.

Apply FCO (Function-Context-Outcome) analysis and return STRICT JSON only:
{
  "title_summary_ko": "≤40자 한글 한 줄 요약",
  "overall_sentiment": "positive" | "negative" | "mixed" | "neutral",
  "fco_keywords": [
    { "function": "Picture Quality" | "Sound" | "Smart/AI/OS" | "Design & Build" | "Installation" | "Reliability" | "Value" | "Gaming" | "Other",
      "context": "short context phrase",
      "outcome": "positive" | "negative",
      "evidence_en": "short quote",
      "ts_start": seconds, "ts_end": seconds }
  ],
  "pros_segments": [
    { "label_ko": "한글 라벨", "evidence_en": "quote", "ts_start": seconds, "ts_end": seconds }
  ],
  "cons_segments": [
    { "label_ko": "한글 라벨", "evidence_en": "quote", "ts_start": seconds, "ts_end": seconds }
  ],
  "competitor_comparisons": [
    { "brand_masked": "SS"|"SN"|"C브랜드"|"기타", "outcome": "win"|"loss"|"neutral", "evidence_en": "quote" }
  ],
  "emotion_distribution": {
    "satisfaction": int, "disappointment": int, "expectation": int,
    "anxiety": int, "anger": int, "trust": int
  },
  "comment_consensus_ko": "≤80자 시청자 합의 요약 또는 null",
  "confidence": 0.0-1.0
}

Rules:
- Mask competitor brands: Samsung→SS, Sony→SN, TCL/Hisense/Vizio→C브랜드, others→기타.
- 3-7 fco_keywords, 2-5 pros_segments, 2-5 cons_segments. Empty arrays if absent.
- Timestamps in seconds (integers). Skip ts if unavailable.
- Output ONLY the JSON object. No markdown.`;

/** Fetch YouTube transcript via timedtext public endpoint */
async function fetchTranscript(videoId: string): Promise<string | null> {
  // Try English first, then auto-generated, then any available
  const langs = ["en", "en-US", "ko"];
  for (const lang of langs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!r.ok) continue;
      const txt = await r.text();
      if (!txt || txt.length < 20) continue;
      try {
        const j = JSON.parse(txt);
        const events = j.events || [];
        const lines: string[] = [];
        for (const ev of events) {
          const t = Math.floor((ev.tStartMs || 0) / 1000);
          const seg = (ev.segs || []).map((s: any) => s.utf8 || "").join("").trim();
          if (seg && seg !== "\n") lines.push(`[${t}s] ${seg.replace(/\s+/g, " ")}`);
        }
        if (lines.length > 5) return lines.join("\n").slice(0, 18000);
      } catch { /* not json3, skip */ }
    } catch { /* network, try next */ }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { review_id, video_id, top_comments } = await req.json();
    if (!review_id || !video_id) {
      return new Response(JSON.stringify({ error: "review_id and video_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    await supabase.from("reviews").update({ media_analysis_status: "processing" }).eq("id", review_id);

    const transcript = await fetchTranscript(video_id);
    const hasTranscript = !!transcript;

    const commentsBlock = Array.isArray(top_comments) && top_comments.length > 0
      ? `\n\nTOP VIEWER COMMENTS:\n${top_comments.slice(0, 30).map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const userPayload = hasTranscript
      ? `VIDEO ID: ${video_id}\n\nTRANSCRIPT (with [seconds] markers):\n${transcript}${commentsBlock}`
      : `VIDEO ID: ${video_id}\n\n[NO TRANSCRIPT AVAILABLE]\n\nUse only the comments below. Set ts fields to 0 and confidence ≤0.4.${commentsBlock}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPayload },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("Video AI error:", aiResp.status, t);
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
    parsed.modality = "video";
    parsed.has_transcript = hasTranscript;
    parsed.video_id = video_id;

    await supabase.from("reviews").update({
      multimodal_analysis: parsed,
      multimodal_analyzed_at: parsed.analyzed_at,
      media_analysis_status: "done",
    }).eq("id", review_id);

    return new Response(JSON.stringify({ ok: true, analysis: parsed, transcript_available: hasTranscript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-video-review error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});