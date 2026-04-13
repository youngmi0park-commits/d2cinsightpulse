import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BV_BASE = "https://api.bazaarvoice.com/data";

// ── Normalize BV CategoryId → clean category ──
const CATEGORY_NORM: Record<string, string> = {
  // BV category codes (US)
  CT52002425: "Washer", CT52000826: "Refrigerator", CT52001903: "Dryer",
  CT52001906: "Dishwasher", CT52000821: "TV", CT52001900: "Air Conditioner",
  CT00008334: "Monitor", CT00008363: "Audio", CT52006585: "Vacuum",
  CT52001901: "Range/Oven", CT52000179: "TV", CT52000182: "Audio",
  CT52000129: "Laptop", CT10000010: "Monitor", CT52006087: "Projector",
  CT10000016: "Air Conditioner", CT52006086: "Vacuum", CT41000491: "Styler",
  CT52106203: "Dishwasher", CT52006634: "Range/Oven", CT52006085: "Air Purifier",
  CT10000011: "Laptop", CT52000823: "Microwave", CT10000018: "Refrigerator",
  // BV composite codes
  C_APPLIANCE_WASHER_DRYER: "Washer", C_APPLIANCE_AIR_CARE: "Air Purifier",
  C_APPLIANCE_DISHWASHER: "Dishwasher", C_APPLIANCE_VACUUM_CLEANER: "Vacuum",
  C_TV_AUDIO_VIDEO_TV_SOUNDBAR: "Audio", C_COMPUTING_LAPTOP: "Laptop",
  // Text labels
  TV: "TV", "OLED TV": "TV", OLED: "TV", Washer: "Washer",
  "Washing Machine": "Washer", Refrigerator: "Refrigerator", Dryer: "Dryer",
  Monitor: "Monitor", Audio: "Audio", Soundbar: "Audio",
  "Air Conditioner": "Air Conditioner", "LG art cool": "Air Conditioner",
  Laptop: "Laptop", "Air Purifier": "Air Purifier", Microwave: "Microwave",
  Projector: "Projector", Dishwasher: "Dishwasher", Vacuum: "Vacuum",
  "Robot Vacuum": "Vacuum", Styler: "Styler", "Range/Oven": "Range/Oven",
  Range: "Range/Oven", Cooking: "Range/Oven", Accessory: "Accessory",
  Accessories: "Accessory",
};

// ── Model-number regex fallback ──
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

// ── Display-name based inference (for MD* BV IDs where model_number is useless) ──
function inferCategoryFromDisplayName(displayName: string): string | null {
  const upper = displayName.toUpperCase();
  // Washer/Dryer display names start with model codes
  if (/^WM\d/.test(displayName) || /^WT\d/.test(displayName) || /^WD\d/.test(displayName)) return "Washer";
  if (/^DLE\d/.test(displayName) || /^DLG\d/.test(displayName) || /^DLEX/.test(displayName) || /^DLGX/.test(displayName)) return "Dryer";
  if (upper.includes("SMART TV") && !upper.includes("MONITOR")) return "TV";
  if (/OLED\s*EVO/i.test(displayName) && !upper.includes("MONITOR")) return "TV";
  if (/^OLED\d+C\d/i.test(displayName)) return "TV";
  if (upper.includes("WASHER") || upper.includes("WASHING MACHINE") || upper.includes("WASHTOWER")) return "Washer";
  if (upper.includes("DRYER") && !upper.includes("COMBO")) return "Dryer";
  if (/^LREL|^LRGL|^LSE\d|^LRE\d/.test(displayName)) return "Range/Oven";
  if (/^LRFX|^LRYX|^LRDC|^LRMV|^LRFG|^LFDS/.test(displayName)) return "Refrigerator";
  return null;
}

// ── Infer monitor sub_category from display name ──
function inferMonitorSubCategory(displayName: string): string {
  const upper = displayName.toUpperCase();
  if (upper.includes("ULTRAGEAR") || /\d+G[XSPQN]\d/.test(displayName)) return "UltraGear";
  if (upper.includes("ULTRAFINE")) return "UltraFine";
  if (upper.includes("ULTRAWIDE") || upper.includes("21:9")) return "UltraWide";
  if (upper.includes("SMART MONITOR") || upper.includes("SMART SWING") || upper.includes("MYVIEW")) return "Smart Monitor";
  if (upper.includes("GRAM") || upper.includes("+VIEW") || upper.includes("PORTABLE MONITOR")) return "gram +view";
  if (upper.includes("DUALUP")) return "DualUp";
  if (upper.includes("OLED") || upper.includes("WOLED")) return "OLED Monitor";
  return "General Monitor";
}

function normalizeCategory(bvCatId: string | null, modelNumber: string, displayName = ""): string {
  if (bvCatId && CATEGORY_NORM[bvCatId]) return CATEGORY_NORM[bvCatId];
  const inferred = inferCategoryFromModel(modelNumber);
  if (inferred) return inferred;
  const fromName = inferCategoryFromDisplayName(displayName);
  if (fromName) return fromName;
  return "General";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { locale = "en_US", batchSize = 50 } = await req.json().catch(() => ({}));

  const LOCALE_KEY_MAP: Record<string, string> = {
    en_US: "BAZAARVOICE_US_API_KEY", en_GB: "BAZAARVOICE_UK_API_KEY",
    en_IN: "BAZAARVOICE_IN_API_KEY", zh_TW: "BAZAARVOICE_TW_API_KEY",
    ja_JP: "BAZAARVOICE_JP_API_KEY", th_TH: "BAZAARVOICE_TH_API_KEY",
    de_DE: "BAZAARVOICE_DE_API_KEY", en_AU: "BAZAARVOICE_AU_API_KEY",
  };
  const passkey = Deno.env.get(LOCALE_KEY_MAP[locale] ?? "BAZAARVOICE_US_API_KEY")!;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Get General products (prioritize those with MD model numbers = BV internal IDs)
  const { data: generalProducts, error: fetchErr } = await supabase
    .from("products")
    .select("id, model_number, display_name")
    .eq("category", "General")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (fetchErr || !generalProducts?.length) {
    return new Response(JSON.stringify({
      success: true,
      message: generalProducts?.length ? "fetch error" : "No General products remaining",
      remaining: 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let updated = 0;
  let modelInferred = 0;
  let bvResolved = 0;
  let stillGeneral = 0;

  // 2. First pass: try model-number + display-name inference (no API calls needed)
  for (const prod of generalProducts) {
    const inferred = inferCategoryFromModel(prod.model_number)
      || inferCategoryFromDisplayName(prod.display_name);
    if (inferred) {
      const subCat = inferred === "Monitor" ? inferMonitorSubCategory(prod.display_name) : null;
      await supabase.from("products").update({
        category: inferred,
        ...(subCat ? { sub_category: subCat } : {}),
      }).eq("id", prod.id);
      modelInferred++;
      updated++;
    }
  }

  // 3. Second pass: BV API lookup for remaining General products (those with MD* IDs)
  const needsBV = generalProducts.filter(p => {
    const inferred = inferCategoryFromModel(p.model_number);
    return !inferred && p.model_number.startsWith("MD");
  });

  // Batch BV queries (up to 10 product IDs per API call)
  const BV_BATCH = 10;
  for (let i = 0; i < needsBV.length; i += BV_BATCH) {
    const batch = needsBV.slice(i, i + BV_BATCH);
    const productIds = batch.map(p => p.model_number).join(",");

    const url = new URL(BV_BASE + "/products.json");
    url.searchParams.set("apiversion", "5.4");
    url.searchParams.set("passkey", passkey);
    url.searchParams.set("Locale", locale);
    url.searchParams.set("Filter", "Id:" + productIds);
    url.searchParams.set("Include", "Categories");
    url.searchParams.set("Limit", String(BV_BATCH));

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        if (res.status === 429) {
          await new Promise(r => setTimeout(r, 3000));
          i -= BV_BATCH; // retry
          continue;
        }
        console.error("[BACKFILL] BV API " + res.status);
        await res.text();
        continue;
      }

      const data = await res.json();
      const results = data.Results ?? [];

      for (const bvProd of results) {
        const catId = bvProd.CategoryId ?? null;
        const dbProd = batch.find(p => p.model_number === bvProd.Id);
        if (!dbProd) continue;

        // Try to get a better display name
        const betterName = bvProd.Name || dbProd.display_name;
        const resolved = normalizeCategory(catId, dbProd.model_number);

        if (resolved !== "General") {
          await supabase.from("products")
            .update({ category: resolved, display_name: betterName })
            .eq("id", dbProd.id);
          bvResolved++;
          updated++;
        } else {
          // If BV returned a raw CategoryId we don't know, log it
          if (catId) console.log("[BACKFILL] Unknown BV CategoryId: " + catId + " for " + dbProd.model_number);
          stillGeneral++;
        }
      }

      // Products not found in BV results
      for (const dbProd of batch) {
        if (!results.find((r: any) => r.Id === dbProd.model_number)) {
          stillGeneral++;
        }
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error("[BACKFILL] Error: " + (e as Error).message);
    }
  }

  // Count remaining
  const { count: remaining } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category", "General")
    .eq("is_active", true);

  return new Response(JSON.stringify({
    success: true,
    locale,
    processed: generalProducts.length,
    updated,
    modelInferred,
    bvResolved,
    stillGeneral,
    remaining: remaining ?? 0,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
