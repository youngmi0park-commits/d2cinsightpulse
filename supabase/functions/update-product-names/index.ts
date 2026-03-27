import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_MAP: Record<string, string> = {
  televisions: "TV", tv: "TV", oled: "TV", qned: "TV", nanocell: "TV",
  monitors: "Monitor", monitor: "Monitor", ultragear: "Monitor", ultrawide: "Monitor",
  laptops: "Laptop", laptop: "Laptop", gram: "Laptop",
  refrigerators: "Refrigerator", refrigerator: "Refrigerator", instaview: "Refrigerator",
  washers: "Washer", washer: "Washer", washtower: "Washer",
  dryers: "Dryer", dryer: "Dryer",
  dishwashers: "Dishwasher", dishwasher: "Dishwasher",
  ranges: "Range", range: "Range",
  air: "Air Conditioner",
  soundbars: "Audio", soundbar: "Audio", speakers: "Audio", headphones: "Audio", earbuds: "Audio", tone: "Audio", xboom: "Audio",
  vacuums: "Vacuum", vacuum: "Vacuum", cordzero: "Vacuum",
  styler: "Styler",
  microwave: "Microwave", microwaves: "Microwave",
  projector: "Projector", projectors: "Projector", cinebeam: "Projector",
  dehumidifier: "Dehumidifier", purifier: "Air Purifier", puricare: "Air Purifier",
};

function mapCategory(bvCategoryId: string | undefined, bvName: string | undefined): string | null {
  const text = `${bvCategoryId || ""} ${bvName || ""}`.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(key)) return val;
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

    const BAZAARVOICE_US_API_KEY = Deno.env.get("BAZAARVOICE_US_API_KEY");
    const BAZAARVOICE_UK_API_KEY = Deno.env.get("BAZAARVOICE_UK_API_KEY");

    const { region = "US", batch_size = 20, offset = 0 } = await req.json().catch(() => ({}));
    const regionUpper = region.toUpperCase();

    const apiKey = regionUpper === "UK" ? BAZAARVOICE_UK_API_KEY : BAZAARVOICE_US_API_KEY;
    const locale = regionUpper === "UK" ? "en_GB" : "en_US";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: `BAZAARVOICE_${regionUpper}_API_KEY not set` }), {
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

    // Process individually
    for (let i = 0; i < products.length; i++) {
      const prod = products[i];

      // Use reviews endpoint with Products include to get full product info
      const bvUrl = `https://api.bazaarvoice.com/data/reviews.json?apiversion=5.5&passkey=${apiKey}&locale=${locale}&filter=productid:eq:${encodeURIComponent(prod.model_number)}&include=Products&limit=1`;

      try {
        const resp = await fetch(bvUrl);
        if (!resp.ok) {
          console.warn(`BV API error for ${prod.model_number}: ${resp.status}`);
          skipped++;
          continue;
        }

        const bvData = await resp.json();
        
        // Get product info from Includes.Products
        const includedProducts = bvData.Includes?.Products || {};
        const prodKeys = Object.keys(includedProducts);
        
        if (prodKeys.length === 0) {
          skipped++;
          continue;
        }

        const bvProd = includedProducts[prodKeys[0]];
        // Try Description first (usually has full product name), then Name
        let realName = bvProd?.Description || bvProd?.Name;
        
        // If Description/Name is too short or looks like a model number, try Brand + Name
        if (realName && realName.length < 10 && bvProd?.Brand?.Name) {
          realName = `${bvProd.Brand.Name} ${realName}`;
        }

        if (!realName || /^LG Product/i.test(realName)) {
          skipped++;
          continue;
        }
        
        // Log the first few for debugging
        if (i < 3) {
          console.log(`[${regionUpper}] ${prod.model_number} → Name: ${bvProd?.Name}, Desc: ${bvProd?.Description}, Cat: ${bvProd?.CategoryId}`);
        }

        const bvCatId = bvProd?.CategoryId;
        const mappedCategory = mapCategory(bvCatId, realName) || prod.category;

        const { error: updateErr } = await supabase
          .from("products")
          .update({
            display_name: realName.slice(0, 255),
            category: mappedCategory !== "General" ? mappedCategory : prod.category,
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
      } catch (e) {
        console.warn(`BV fetch error for ${prod.model_number}: ${e.message}`);
        skipped++;
      }

      // Small delay to avoid rate limits
      if (i < products.length - 1) {
        await new Promise(r => setTimeout(r, 200));
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
