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

// ── Normalize BV CategoryId → clean category ──
const CATEGORY_NORM: Record<string, string> = {
  CT52002425: "Washer", CT52000826: "Refrigerator", CT52001903: "Dryer",
  CT52001906: "Dishwasher", CT52000821: "TV", CT52001900: "Air Conditioner",
  CT00008334: "Monitor", CT00008363: "Audio", CT52006585: "Vacuum",
  CT52001901: "Range/Oven", CT52000179: "TV", CT52000182: "Audio",
  CT52000129: "Laptop", CT10000010: "Monitor", CT52006087: "Projector",
  CT10000016: "Air Conditioner", CT52006086: "Vacuum", CT41000491: "Styler",
  CT52106203: "Dishwasher", CT52006634: "Range/Oven", CT52006085: "Air Purifier",
  CT10000011: "Laptop", CT52000823: "Microwave", CT10000018: "Refrigerator",
  C_APPLIANCE_WASHER_DRYER: "Washer", C_APPLIANCE_AIR_CARE: "Air Purifier",
  C_APPLIANCE_DISHWASHER: "Dishwasher", C_APPLIANCE_VACUUM_CLEANER: "Vacuum",
  C_TV_AUDIO_VIDEO_TV_SOUNDBAR: "Audio", C_COMPUTING_LAPTOP: "Laptop",
  TV: "TV", "OLED TV": "TV", Washer: "Washer", "Washing Machine": "Washer",
  Refrigerator: "Refrigerator", Dryer: "Dryer", Monitor: "Monitor",
  Audio: "Audio", Soundbar: "Audio", Laptop: "Laptop",
  "Air Conditioner": "Air Conditioner", "Air Purifier": "Air Purifier",
  Microwave: "Microwave", Projector: "Projector", Dishwasher: "Dishwasher",
  Vacuum: "Vacuum", "Robot Vacuum": "Vacuum", Styler: "Styler",
  "Range/Oven": "Range/Oven", Range: "Range/Oven", Cooking: "Range/Oven",
  Accessory: "Accessory", Accessories: "Accessory",
};

function inferCategoryFromModel(model: string): string | null {
  const m = model.toUpperCase();
  if (/^(LREL|LRGL|LSGL|LSEL|LSE\d|LRE\d)/.test(m)) return "Range/Oven";
  if (/^(LT1000|LT500|LT700|ADQ)/.test(m)) return "Accessory";
  if (/^(WKEX|WKGX|WKE\d|WKG\d)/.test(m)) return "Washer";
  if (/^(DLEX|DLE\d|DLG\d|DLGX)/.test(m)) return "Dryer";
  if (/^(MVEM|MVEL|MH\d|MS\d|MC\d|LMC)/.test(m)) return "Microwave";
  if (/^(LDFN|LDF\d|LDT\d|LDP\d|UD50)/.test(m)) return "Dishwasher";
  if (/^(LRFX|LRYX|LRDC|LF\d|LRMV|LRFG|LFDS|LRYKS|LRYKC|LRYXC)/.test(m)) return "Refrigerator";
  if (/^\d+(UQ|UR|NANO|QNED)/.test(m)) return "TV";
  if (/^A9[0-9A-Z]/.test(m)) return "Vacuum";
  if (/^(WM\d|WT\d|WD\d)/.test(m)) return "Washer";
  if (/^(C53|S5\d)/.test(m)) return "Styler";
  if (/^\d+(GX|GP|GN|GQ|GL)/.test(m)) return "Monitor";
  if (/^\d+(OLED|C\d|B\d|G\d)/.test(m)) return "TV";
  return null;
}

function normalizeCategory(bvCatId: string | null, modelNumber: string): string {
  if (bvCatId && CATEGORY_NORM[bvCatId]) return CATEGORY_NORM[bvCatId];
  const inferred = inferCategoryFromModel(modelNumber);
  if (inferred) return inferred;
  return "General";
}

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

  const LOCALE_KEY_MAP: Record<string, string> = {
    en_US: "BAZAARVOICE_US_API_KEY",
    en_GB: "BAZAARVOICE_UK_API_KEY",
    en_IN: "BAZAARVOICE_IN_API_KEY",
    zh_TW: "BAZAARVOICE_TW_API_KEY",
    ja_JP: "BAZAARVOICE_JP_API_KEY",
    th_TH: "BAZAARVOICE_TH_API_KEY",
    de_DE: "BAZAARVOICE_DE_API_KEY",
    en_AU: "BAZAARVOICE_AU_API_KEY",
  };
  const LOCALE_REGION_MAP: Record<string, string> = {
    en_US: "us", en_GB: "uk", en_IN: "in", zh_TW: "tw",
    ja_JP: "jp", th_TH: "th", de_DE: "de", en_AU: "au",
  };
  const passkey = Deno.env.get(LOCALE_KEY_MAP[locale] ?? "BAZAARVOICE_US_API_KEY")!;
  const region = LOCALE_REGION_MAP[locale] ?? "us";

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
