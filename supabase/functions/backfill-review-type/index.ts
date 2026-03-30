import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Backfill review_type for existing LG.com reviews by re-querying Bazaarvoice API.
 * 
 * Call with POST body:
 *   { "region": "us" | "uk", "offset": 0, "limit": 500 }
 * 
 * Each invocation processes up to `limit` reviews from BV API starting at `offset`.
 * Run multiple times incrementing offset to cover all reviews.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const BAZAARVOICE_US_API_KEY = Deno.env.get("BAZAARVOICE_US_API_KEY");
  const BAZAARVOICE_UK_API_KEY = Deno.env.get("BAZAARVOICE_UK_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing Supabase env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let region: "us" | "uk" = "us";
  let offset = 0;
  let limit = 500;

  try {
    const body = await req.json();
    if (body.region === "uk") region = "uk";
    if (typeof body.offset === "number") offset = body.offset;
    if (typeof body.limit === "number") limit = Math.min(body.limit, 1000);
  } catch {
    // defaults
  }

  const apiKey = region === "uk" ? BAZAARVOICE_UK_API_KEY : BAZAARVOICE_US_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: `Missing BAZAARVOICE_${region.toUpperCase()}_API_KEY` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let totalChecked = 0;
  let totalUpdated = 0;
  let totalSyndicated = 0;
  const errors: string[] = [];
  const bvPageSize = 100;
  const pages = Math.ceil(limit / bvPageSize);

  try {
    for (let page = 0; page < pages; page++) {
      const currentOffset = offset + page * bvPageSize;
      const url = new URL("https://api.bazaarvoice.com/data/reviews.json");
      url.searchParams.set("apiversion", "5.4");
      url.searchParams.set("passkey", apiKey);
      url.searchParams.set("Sort", "SubmissionTime:desc");
      url.searchParams.set("Limit", String(bvPageSize));
      url.searchParams.set("Offset", String(currentOffset));

      console.log(`[Backfill-${region.toUpperCase()}] Fetching offset=${currentOffset}`);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const errText = await res.text();
        errors.push(`BV API error at offset ${currentOffset}: ${res.status} - ${errText.slice(0, 200)}`);
        break;
      }

      const data = await res.json();
      const bvReviews = data.Results || [];

      if (bvReviews.length === 0) {
        console.log(`[Backfill-${region.toUpperCase()}] No more reviews at offset ${currentOffset}`);
        break;
      }

      // Process each BV review: check syndication and update DB
      for (const bv of bvReviews) {
        totalChecked++;
        const externalId = `bv_${region}_${bv.Id}`;

        // Determine review_type
        let reviewType = "organic";
        if (bv.IsSyndicated === true || bv.SyndicationSource) {
          const sourceName = bv.SyndicationSource?.Name || "external";
          reviewType = `Originally posted on ${sourceName}`;
          totalSyndicated++;
        }

        // Update in DB
        const { error: updateErr } = await supabase
          .from("reviews")
          .update({ review_type: reviewType })
          .eq("external_id", externalId);

        if (updateErr) {
          // Not found is fine — some reviews may have been filtered during collection
        } else {
          totalUpdated++;
        }
      }

      console.log(`[Backfill-${region.toUpperCase()}] Page done: checked=${bvReviews.length}, syndicatedSoFar=${totalSyndicated}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        region,
        offset,
        limit,
        total_checked: totalChecked,
        total_updated: totalUpdated,
        total_syndicated: totalSyndicated,
        errors: errors.slice(0, 5),
        next_offset: offset + totalChecked,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Backfill error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err), total_checked: totalChecked, total_updated: totalUpdated }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
