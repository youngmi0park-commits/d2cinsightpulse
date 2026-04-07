import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BV_BASE = "https://api.bazaarvoice.com/data";
const PAGE_SIZE = 100;
const DEFAULT_BATCH = 15;
const RATE_DELAY = 300;

function sanitizePII(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    .replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[phone]")
    .replace(/\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct)\b\.?/gi, "[address]")
    .replace(/(?:my name is|I'm)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi, "[name]");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const {
    locale = "en_US",
    runType = "incremental",
    batchSize = DEFAULT_BATCH,
  } = await req.json().catch(() => ({}));

  const passkey = locale === "en_US"
    ? Deno.env.get("BAZAARVOICE_US_API_KEY")!
    : Deno.env.get("BAZAARVOICE_UK_API_KEY")!;
  const region = locale === "en_US" ? "us" : "uk";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Create run log
  const { data: runLog } = await supabase
    .from("bv_collection_runs")
    .insert({ run_type: runType, locale, status: "running" })
    .select().single();
  const runId = runLog?.id;

  let reviewsFetched = 0;
  let reviewsInserted = 0;
  let reviewsSkipped = 0;
  let errorCount = 0;
  let productsDone = 0;

  try {
    // Get incomplete products
    let query = supabase
      .from("bv_collection_progress")
      .select("*")
      .eq("locale", locale)
      .eq("is_complete", false)
      .order("total_available", { ascending: false })
      .limit(batchSize);

    if (runType === "incremental") {
      query = query.is("last_run_at", null);
    }

    const { data: products } = await query;
    if (!products?.length) {
      await supabase.from("bv_collection_runs")
        .update({ status: "done_nothing", completed_at: new Date().toISOString() })
        .eq("id", runId);
      return new Response(
        JSON.stringify({ success: true, message: "No pending products", locale }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("bv_collection_runs")
      .update({ products_queued: products.length }).eq("id", runId);

    // Product cache for DB lookups
    const productCache: Record<string, string> = {};

    for (const prog of products) {
      const bvProductId = prog.product_id;
      let offset = prog.last_offset ?? 0;
      let hasMore = true;
      let totalBV = prog.total_available;
      let prodInserted = 0;
      let prodSkipped = 0;
      let prodFetched = 0;

      try {
        while (hasMore) {
          const url = new URL(BV_BASE + "/reviews.json");
          url.searchParams.set("apiversion", "5.4");
          url.searchParams.set("passkey", passkey);
          url.searchParams.set("Locale", locale);
          url.searchParams.set("Filter", "ProductId:" + bvProductId);
          url.searchParams.set("Limit", String(PAGE_SIZE));
          url.searchParams.set("Offset", String(offset));
          url.searchParams.set("Sort", "SubmissionTime:asc");
          url.searchParams.set("Include", "Products");

          const res = await fetch(url.toString());
          if (!res.ok) {
            if (res.status === 429) {
              await new Promise(r => setTimeout(r, 3000));
              continue;
            }
            const errBody = await res.text();
            console.error("[BV] " + res.status + " for " + bvProductId + ": " + errBody.slice(0, 200));
            break;
          }

          const data = await res.json();
          const reviews = data.Results ?? [];
          totalBV = data.TotalResults ?? totalBV;
          prodFetched += reviews.length;

          if (reviews.length === 0) break;

          // Build batch rows
          const rows: any[] = [];
          for (const rv of reviews) {
            const reviewText = (rv.ReviewText as string) ?? "";
            if (reviewText.trim().length < 20) { prodSkipped++; continue; }

            const externalId = "bv_" + region + "_" + rv.Id;
            const rating = Number(rv.Rating) || null;
            let sentiment = "neutral";
            let sentimentScore = 0.5;
            if (rating !== null) {
              if (rating >= 4) { sentiment = "positive"; sentimentScore = 0.7 + (rating - 4) * 0.15; }
              else if (rating <= 2) { sentiment = "negative"; sentimentScore = 0.1 + (rating - 1) * 0.15; }
            }

            const safeContent = sanitizePII(reviewText).slice(0, 2000);
            const originalName = rv.OriginalProductName || "";
            const modelNum = originalName && !originalName.startsWith("MD")
              ? originalName : bvProductId;
            const displayName = rv.Products?.[rv.ProductId]?.Name || prog.product_name || "LG Product";
            const category = rv.Products?.[rv.ProductId]?.CategoryId || prog.category || "General";

            // Ensure product exists in products table
            if (!productCache[modelNum]) {
              const { data: existing } = await supabase
                .from("products").select("id").eq("model_number", modelNum).maybeSingle();
              if (existing) {
                productCache[modelNum] = existing.id;
              } else {
                const { data: newProd } = await supabase
                  .from("products")
                  .insert({ model_number: modelNum, display_name: displayName, category })
                  .select("id").single();
                if (newProd) productCache[modelNum] = newProd.id;
              }
            }
            const dbProductId = productCache[modelNum];
            if (!dbProductId) { prodSkipped++; continue; }

            let reviewType = "organic";
            if (rv.IsSyndicated === true || rv.SyndicationSource) reviewType = "syndication";

            rows.push({
              product_id: dbProductId,
              source: "lge_com_" + region,
              source_url: "bazaarvoice://lg/" + rv.Id,
              external_id: externalId,
              title: rv.Title || null,
              content: safeContent,
              author: "LG Review User",
              rating,
              sentiment,
              sentiment_score: sentimentScore,
              published_at: rv.SubmissionTime?.split("T")[0] || null,
              emotion_category: sentiment === "positive" ? "satisfaction" : sentiment === "negative" ? "frustration" : "neutral",
              emotion_intensity: rating ? Math.min(5, Math.max(1, rating)) : 3,
              user_type: rv.BadgesOrder?.includes("verifiedPurchaser") ? "actual_user" : "unknown",
              content_type: "review",
              platform_type: "retailer",
              review_type: reviewType,
            });
          }

          // Bulk upsert
          if (rows.length > 0) {
            const { data: inserted, error: err } = await supabase
              .from("reviews")
              .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false })
              .select("id");
            const count = inserted?.length ?? 0;
            prodInserted += count;
            if (err) console.error("[BV] Insert error: " + err.message);
          }

          offset += reviews.length;

          // Save checkpoint
          await supabase.from("bv_collection_progress").update({
            last_offset: offset,
            total_collected: (prog.total_collected ?? 0) + prodInserted,
            total_available: totalBV,
            is_complete: offset >= totalBV,
            last_run_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("locale", locale).eq("product_id", bvProductId);

          hasMore = reviews.length === PAGE_SIZE && offset < totalBV;
          await new Promise(r => setTimeout(r, RATE_DELAY));
        }
      } catch (e) {
        console.error("[BV] Error on product " + bvProductId + ": " + e);
        errorCount++;
      }

      reviewsFetched += prodFetched;
      reviewsInserted += prodInserted;
      reviewsSkipped += prodSkipped;
      productsDone++;

      // Update run log periodically
      await supabase.from("bv_collection_runs").update({
        products_done: productsDone,
        reviews_fetched: reviewsFetched,
        reviews_inserted: reviewsInserted,
        reviews_skipped: reviewsSkipped,
        error_count: errorCount,
      }).eq("id", runId);
    }
  } catch (err) {
    await supabase.from("bv_collection_runs")
      .update({ status: "error", completed_at: new Date().toISOString() })
      .eq("id", runId);
    return new Response(JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  await supabase.from("bv_collection_runs").update({
    status: "done", completed_at: new Date().toISOString(),
    products_done: productsDone, reviews_fetched: reviewsFetched,
    reviews_inserted: reviewsInserted, reviews_skipped: reviewsSkipped,
    error_count: errorCount,
  }).eq("id", runId);

  return new Response(
    JSON.stringify({
      success: true, locale, productsDone,
      reviewsFetched, reviewsInserted, reviewsSkipped, errorCount,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
