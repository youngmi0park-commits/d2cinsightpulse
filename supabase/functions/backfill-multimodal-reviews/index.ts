import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Scan existing reviews and:
 * 1) Detect if their source_url / content references a YouTube video or photo URLs
 * 2) Mark has_media + media_type + media_urls
 * 3) Enqueue analyze-photo-review or analyze-video-review for the first N pending items
 *
 * Body: { limit?: number, dry_run?: boolean }
 */

/**
 * Bulk SQL fast-path for marking media via regex.
 * mode="bulk_mark": one batched UPDATE per call, no per-row roundtrip.
 * mode="queue_analysis": pulls reviews already marked has_media=true but not yet analyzed,
 *                       and dispatches photo/video analysis edge calls.
 * Default mode (no `mode` param) keeps the legacy per-row scan behavior.
 */

const YT_PATTERNS = [
  /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/i,
  /youtu\.be\/([A-Za-z0-9_-]{11})/i,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/i,
];
const IMG_REGEX = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi;

function detectMedia(row: { source: string; source_url: string | null; content: string | null }):
  { has_media: boolean; media_type: string; media_urls: string[] } {
  const urls: string[] = [];
  let videoFound = false;

  // YouTube detection — source already 'youtube*' OR source_url/content contains a YT link
  if (row.source.startsWith("youtube") && row.source_url) {
    for (const p of YT_PATTERNS) {
      const m = row.source_url.match(p);
      if (m) { urls.push(m[1]); videoFound = true; break; }
    }
  }
  if (!videoFound && row.content) {
    for (const p of YT_PATTERNS) {
      const m = row.content.match(p);
      if (m) { urls.push(m[1]); videoFound = true; break; }
    }
  }

  // Photo URLs in content
  const photoUrls: string[] = [];
  if (row.content) {
    const matches = row.content.match(IMG_REGEX) || [];
    for (const u of matches.slice(0, 5)) photoUrls.push(u);
  }

  if (videoFound && photoUrls.length > 0) return { has_media: true, media_type: "mixed", media_urls: [...urls, ...photoUrls] };
  if (videoFound) return { has_media: true, media_type: "video", media_urls: urls };
  if (photoUrls.length > 0) return { has_media: true, media_type: "photo", media_urls: photoUrls };
  return { has_media: false, media_type: "none", media_urls: [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Number(body.limit) || 200, 1000);
    const dryRun = !!body.dry_run;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Pull a batch of reviews not yet scanned for media
    const { data: rows, error } = await supabase
      .from("reviews")
      .select("id, source, source_url, content, has_media")
      .eq("media_analysis_status", "pending")
      .order("collected_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    let detected = 0, photoQueued = 0, videoQueued = 0, skipped = 0;
    const errs: string[] = [];

    for (const r of rows || []) {
      const media = detectMedia(r as any);
      if (!media.has_media) {
        if (!dryRun) {
          await supabase.from("reviews").update({
            has_media: false, media_type: "none", media_analysis_status: "skipped",
          }).eq("id", r.id);
        }
        skipped++;
        continue;
      }
      detected++;
      if (dryRun) continue;

      await supabase.from("reviews").update({
        has_media: true, media_type: media.media_type, media_urls: media.media_urls,
      }).eq("id", r.id);

      try {
        if (media.media_type === "photo" || media.media_type === "mixed") {
          const photoUrls = media.media_urls.filter(u => /^https?:\/\//.test(u));
          if (photoUrls.length > 0) {
            // Fire-and-forget: queue 1 at a time without await to avoid 150s timeout
            supabase.functions.invoke("analyze-photo-review", { body: { review_id: r.id, image_urls: photoUrls } }).catch(() => {});
            photoQueued++;
          }
        }
        if (media.media_type === "video" || media.media_type === "mixed") {
          const vid = media.media_urls.find(u => /^[A-Za-z0-9_-]{11}$/.test(u));
          if (vid) {
            supabase.functions.invoke("analyze-video-review", { body: { review_id: r.id, video_id: vid } }).catch(() => {});
            videoQueued++;
          }
        }
      } catch (e) {
        errs.push(`${r.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(JSON.stringify({
      ok: true, scanned: rows?.length || 0, detected, skipped,
      photoQueued, videoQueued, dryRun, errors: errs.slice(0, 5),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("backfill-multimodal-reviews error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});