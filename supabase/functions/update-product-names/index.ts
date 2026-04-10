import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_MAP: Record<string, string> = {
  televisions: "TV", tv: "TV", oled: "TV", qned: "TV", nanocell: "TV", "standbyme": "TV", "standby me": "TV",
  monitors: "Monitor", monitor: "Monitor", ultragear: "Monitor", ultrawide: "Monitor",
  laptops: "Laptop", laptop: "Laptop", gram: "Laptop",
  refrigerators: "Refrigerator", refrigerator: "Refrigerator", instaview: "Refrigerator", fridge: "Refrigerator",
  washers: "Washer", washer: "Washer", washtower: "Washer", "washing machine": "Washer",
  dryers: "Dryer", dryer: "Dryer",
  dishwashers: "Dishwasher", dishwasher: "Dishwasher",
  ranges: "Range", range: "Range", oven: "Range",
  air: "Air Conditioner",
  soundbars: "Audio", soundbar: "Audio", speakers: "Audio", headphones: "Audio", earbuds: "Audio", tone: "Audio", xboom: "Audio",
  vacuums: "Vacuum", vacuum: "Vacuum", cordzero: "Vacuum",
  styler: "Styler",
  microwave: "Microwave", microwaves: "Microwave",
  projector: "Projector", projectors: "Projector", cinebeam: "Projector",
  dehumidifier: "Dehumidifier", purifier: "Air Purifier", puricare: "Air Purifier",
  cooktop: "Cooktop",
};

// BV category ID → human category mapping
const BV_CATEGORY_MAP: Record<string, string> = {
  CT10000018: "TV",
  CT10000010: "TV",
  CT52000821: "TV",       // DE TV
  CT00008334: "TV",       // UK TV
  CT52000129: "TV",       // AU TV
  CT52000179: "TV",       // JP TV
  CT10000030: "Monitor",
  CT52001901: "Monitor",
  CT10000002: "Refrigerator",
  CT52000823: "Refrigerator", // DE Refrigerator
  CT52001900: "Refrigerator", // AU Refrigerator
  CT52000826: "Washer",   // DE Washer
  CT00008363: "Washer",   // UK Washer
  CT10000011: "Washer",
  CT52001903: "Dryer",    // AU Dryer
  CT52001906: "Dishwasher", // AU Dishwasher
  CT52002425: "Vacuum",   // Vacuum/Home Care
  CT52006086: "Audio",    // Soundbar
  CT52006634: "Air Purifier",
  CT10000016: "Accessory", // Filters etc.
  CT41000327: "TV",
  CT41000325: "Audio",
  CT41000491: "Appliance Bundle",
  CT00000305: "Accessory",
};

const LOCALE_API_KEYS: Record<string, { envKey: string; locale: string; label: string }> = {
  US: { envKey: "BAZAARVOICE_US_API_KEY", locale: "en_US", label: "US" },
  UK: { envKey: "BAZAARVOICE_UK_API_KEY", locale: "en_GB", label: "UK" },
  IN: { envKey: "BAZAARVOICE_IN_API_KEY", locale: "en_IN", label: "IN" },
  TW: { envKey: "BAZAARVOICE_TW_API_KEY", locale: "zh_TW", label: "TW" },
  JP: { envKey: "BAZAARVOICE_JP_API_KEY", locale: "ja_JP", label: "JP" },
  TH: { envKey: "BAZAARVOICE_TH_API_KEY", locale: "th_TH", label: "TH" },
  DE: { envKey: "BAZAARVOICE_DE_API_KEY", locale: "de_DE", label: "DE" },
  AU: { envKey: "BAZAARVOICE_AU_API_KEY", locale: "en_AU", label: "AU" },
};

function mapCategory(bvCategoryId: string | undefined, bvName: string | undefined): string | null {
  // First try BV category ID mapping
  if (bvCategoryId && BV_CATEGORY_MAP[bvCategoryId]) {
    return BV_CATEGORY_MAP[bvCategoryId];
  }
  // Then try text-based mapping
  const text = `${bvCategoryId || ""} ${bvName || ""}`.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(key)) return val;
  }
  return null;
}

/** Check if a display_name needs updating */
function needsUpdate(displayName: string, modelNumber: string, category: string): boolean {
  if (/^LG Product/i.test(displayName)) return true;
  if (displayName === modelNumber) return true;
  if (/^CT\d+/.test(category)) return true; // BV category ID instead of human name
  if (displayName.length < 8 && !/\s/.test(displayName)) return true; // Too short / just a code
  return false;
}

async function fetchBvProductInfo(
  modelNumber: string,
  apiKey: string,
  locale: string
): Promise<{ name: string | null; categoryId: string | null }> {
  // Try Products API first
  const productsUrl = `https://api.bazaarvoice.com/data/products.json?apiversion=5.5&passkey=${apiKey}&locale=${locale}&filter=id:eq:${encodeURIComponent(modelNumber)}&Stats=Reviews`;

  try {
    const resp = await fetch(productsUrl);
    if (resp.ok) {
      const data = await resp.json();
      const results = data.Results || [];
      if (results.length > 0) {
        const prod = results[0];
        const name = prod?.Description || prod?.Name || null;
        const finalName = name && name.length < 10 && prod?.Brand?.Name
          ? `${prod.Brand.Name} ${name}`
          : name;
        return { name: finalName, categoryId: prod?.CategoryId || null };
      }
    }
  } catch { /* fall through */ }

  // Fallback: reviews endpoint with product includes
  try {
    const fallbackUrl = `https://api.bazaarvoice.com/data/reviews.json?apiversion=5.5&passkey=${apiKey}&locale=${locale}&filter=productid:eq:${encodeURIComponent(modelNumber)}&include=Products&limit=1`;
    const resp = await fetch(fallbackUrl);
    if (resp.ok) {
      const data = await resp.json();
      const prods = data.Includes?.Products || {};
      const keys = Object.keys(prods);
      if (keys.length > 0) {
        const prod = prods[keys[0]];
        const name = prod?.Description || prod?.Name || null;
        return { name, categoryId: prod?.CategoryId || null };
      }
    }
  } catch { /* ignore */ }

  return { name: null, categoryId: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { region = "US", batch_size = 25 } = await req.json().catch(() => ({}));
    const regionUpper = region.toUpperCase();

    const localeConfig = LOCALE_API_KEYS[regionUpper];
    if (!localeConfig) {
      return new Response(JSON.stringify({ error: `Unknown region: ${regionUpper}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get(localeConfig.envKey);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `${localeConfig.envKey} not set` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find products needing updates using multiple targeted queries
    // Query 1: "LG Product" placeholders
    const q1 = supabase.from("products").select("id, model_number, display_name, category")
      .eq("is_active", true).ilike("display_name", "LG Product%").limit(batch_size);
    // Query 2: Category is BV ID (CT...)
    const q2 = supabase.from("products").select("id, model_number, display_name, category")
      .eq("is_active", true).ilike("category", "CT%").limit(batch_size);
    // Query 3: Short/code-like display names (< 15 chars, no spaces)
    const q3 = supabase.from("products").select("id, model_number, display_name, category")
      .eq("is_active", true).order("model_number").limit(200);

    const [r1, r2, r3] = await Promise.all([q1, q2, q3]);
    if (r1.error) throw r1.error;

    // Merge and deduplicate
    const seen = new Set<string>();
    const allCandidates: typeof r1.data = [];
    for (const list of [r1.data || [], r2.data || [], r3.data || []]) {
      for (const p of list) {
        if (!seen.has(p.id) && needsUpdate(p.display_name, p.model_number, p.category)) {
          seen.add(p.id);
          allCandidates.push(p);
        }
      }
    }

    const products = allCandidates.slice(0, batch_size);

    if (products.length === 0) {
      return new Response(JSON.stringify({ message: "No products need updating", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${regionUpper}] Processing ${products.length} incomplete products`);

    let updated = 0;
    let skipped = 0;
    const results: Array<{ model: string; oldName: string; newName: string; category: string }> = [];

    for (let i = 0; i < products.length; i++) {
      const prod = products[i];

      try {
        const bvInfo = await fetchBvProductInfo(prod.model_number, apiKey, localeConfig.locale);

        let newName: string;
        let newCategory: string;

        if (bvInfo.name && !/^LG Product/i.test(bvInfo.name)) {
          // Got a real name from BV
          newName = bvInfo.name.slice(0, 255);
          newCategory = mapCategory(bvInfo.categoryId, bvInfo.name) || mapCategory(prod.category, bvInfo.name) || prod.category;
        } else {
          // No BV data — construct a reasonable name from model number
          const inferredCat = mapCategory(prod.category, prod.model_number) || mapCategory(undefined, prod.model_number);
          newName = `LG ${prod.model_number}`;
          newCategory = inferredCat || (prod.category.startsWith("CT") ? "General" : prod.category);
        }

        // Fix BV category IDs
        if (newCategory.startsWith("CT")) {
          newCategory = BV_CATEGORY_MAP[newCategory] || mapCategory(undefined, newName) || "General";
        }

        const { error: updateErr } = await supabase
          .from("products")
          .update({
            display_name: newName,
            category: newCategory,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prod.id);

        if (updateErr) {
          console.warn(`Update failed for ${prod.model_number}: ${updateErr.message}`);
          skipped++;
        } else {
          updated++;
          results.push({
            model: prod.model_number,
            oldName: prod.display_name.slice(0, 40),
            newName: newName.slice(0, 80),
            category: newCategory,
          });
        }
      } catch (e) {
        console.warn(`BV error for ${prod.model_number}: ${e.message}`);
        skipped++;
      }

      if (i < products.length - 1) {
        await new Promise(r => setTimeout(r, 120));
      }
    }

    // Count remaining
    const totalRemaining = allCandidates.length - updated;

    console.log(`[${regionUpper}] Updated: ${updated}, Skipped: ${skipped}, Remaining: ~${totalRemaining}`);

    return new Response(
      JSON.stringify({
        region: regionUpper,
        processed: products.length,
        updated,
        skipped,
        remaining: Math.max(0, totalRemaining),
        sample_results: results.slice(0, 15),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
