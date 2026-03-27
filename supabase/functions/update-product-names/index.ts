import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// BV API passkeys
const BV_KEYS: Record<string, { passkey: string; locale: string }> = {
  US: { passkey: "caKNy3kJRH1fKEOTfMOQnbPIQuOvXOJMnKxMaavqA2lMo", locale: "en_US" },
  UK: { passkey: "caqHXiNo5l43EpMQz1mzSoBjx42Sw7IEzFO07ifyMlx0Y", locale: "en_GB" },
};

// Category mapping from BV category IDs
const CATEGORY_MAP: Record<string, string> = {
  televisions: "TV",
  tv: "TV",
  monitors: "Monitor",
  monitor: "Monitor",
  laptops: "Laptop",
  laptop: "Laptop",
  gram: "Laptop",
  refrigerators: "Refrigerator",
  refrigerator: "Refrigerator",
  washers: "Washer",
  washer: "Washer",
  dryers: "Dryer",
  dryer: "Dryer",
  dishwashers: "Dishwasher",
  dishwasher: "Dishwasher",
  ranges: "Range",
  range: "Range",
  air_conditioners: "Air Conditioner",
  air_conditioner: "Air Conditioner",
  soundbars: "Audio",
  soundbar: "Audio",
  speakers: "Audio",
  headphones: "Audio",
  earbuds: "Audio",
  vacuums: "Vacuum",
  vacuum: "Vacuum",
  styler: "Styler",
  microwave: "Microwave",
  microwaves: "Microwave",
};

function mapCategory(bvCategoryId: string | undefined): string | null {
  if (!bvCategoryId) return null;
  const lower = bvCategoryId.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { region = "US", batch_size = 20, offset = 0 } = await req.json().catch(() => ({}));
    const regionUpper = region.toUpperCase();
    const bvConfig = BV_KEYS[regionUpper];
    if (!bvConfig) {
      return new Response(JSON.stringify({ error: `Unknown region: ${region}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get generic products for this region
    const likePattern = `LG Product (${regionUpper})`;
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select("id, model_number, display_name, category")
      .eq("display_name", likePattern)
      .range(offset, offset + batch_size - 1);

    if (fetchErr) throw fetchErr;
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: "No more generic products to update", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${regionUpper}] Processing ${products.length} products (offset ${offset})`);

    let updated = 0;
    let skipped = 0;
    const results: Array<{ model: string; name: string; category: string }> = [];

    // Process in chunks of 5 to avoid BV rate limits
    for (let i = 0; i < products.length; i += 5) {
      const chunk = products.slice(i, i + 5);
      
      // Build filter for multiple products
      const productIds = chunk.map(p => p.model_number).join(",");
      
      const bvUrl = `https://api.bazaarvoice.com/data/products.json?apiversion=5.5&passkey=${bvConfig.passkey}&locale=${bvConfig.locale}&filter=id:${encodeURIComponent(productIds)}&include=Categories&stats=Reviews&limit=${chunk.length}`;

      try {
        const resp = await fetch(bvUrl);
        if (!resp.ok) {
          console.warn(`BV API error: ${resp.status}`);
          skipped += chunk.length;
          continue;
        }

        const bvData = await resp.json();
        const bvResults = bvData.Results || [];

        // Map BV results by ID
        const bvMap: Record<string, any> = {};
        for (const bvProd of bvResults) {
          bvMap[bvProd.Id] = bvProd;
        }

        for (const prod of chunk) {
          const bvProd = bvMap[prod.model_number];
          if (!bvProd) {
            // Try case-insensitive match
            const found = bvResults.find((b: any) => b.Id.toLowerCase() === prod.model_number.toLowerCase());
            if (!found) {
              skipped++;
              continue;
            }
            bvMap[prod.model_number] = found;
          }

          const matched = bvMap[prod.model_number] || bvResults.find((b: any) => b.Id.toLowerCase() === prod.model_number.toLowerCase());
          if (!matched) {
            skipped++;
            continue;
          }

          const realName = matched.Name || matched.Description || prod.model_number;
          const bvCatId = matched.CategoryId || (matched.Categories?.length > 0 ? matched.Categories[0]?.Id : null);
          const mappedCategory = mapCategory(bvCatId) || prod.category;

          // Update product
          const { error: updateErr } = await supabase
            .from("products")
            .update({
              display_name: realName.slice(0, 255),
              category: mappedCategory,
              updated_at: new Date().toISOString(),
            })
            .eq("id", prod.id);

          if (updateErr) {
            console.warn(`Update failed for ${prod.model_number}: ${updateErr.message}`);
            skipped++;
          } else {
            updated++;
            results.push({ model: prod.model_number, name: realName.slice(0, 80), category: mappedCategory });
          }
        }
      } catch (e) {
        console.warn(`BV fetch error for chunk: ${e.message}`);
        skipped += chunk.length;
      }

      // Small delay between chunks
      if (i + 5 < products.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`[${regionUpper}] Updated: ${updated}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({
        region: regionUpper,
        processed: products.length,
        updated,
        skipped,
        remaining_offset: offset + products.length,
        sample_results: results.slice(0, 10),
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
