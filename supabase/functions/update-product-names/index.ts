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

// Check if a name is actually a real product name (not just a model number)
function isRealName(name: string | null | undefined, modelNumber: string): boolean {
  if (!name) return false;
  if (/^LG Product/i.test(name)) return false;
  // If the name is basically the same as model number, it's not a "real" name but still useful
  // Accept any name from BV that isn't the generic placeholder
  return true;
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

    // Always use offset 0 since updated products drop out of the filter
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select("id, model_number, display_name, category")
      .eq("display_name", `LG Product (${regionUpper})`)
      .order("model_number")
      .range(0, batch_size - 1);

    if (fetchErr) throw fetchErr;
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: "No more generic products to update", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${regionUpper}] Processing ${products.length} generic products`);

    let updated = 0;
    let skipped = 0;
    const results: Array<{ model: string; name: string; category: string }> = [];

    for (let i = 0; i < products.length; i++) {
      const prod = products[i];

      // Try Products API directly first (more reliable for product info)
      const productsUrl = `https://api.bazaarvoice.com/data/products.json?apiversion=5.5&passkey=${apiKey}&locale=${locale}&filter=id:eq:${encodeURIComponent(prod.model_number)}&Stats=Reviews`;
      
      try {
        const resp = await fetch(productsUrl);
        if (!resp.ok) {
          // Fallback to reviews endpoint
          const fallbackUrl = `https://api.bazaarvoice.com/data/reviews.json?apiversion=5.5&passkey=${apiKey}&locale=${locale}&filter=productid:eq:${encodeURIComponent(prod.model_number)}&include=Products&limit=1`;
          const fallbackResp = await fetch(fallbackUrl);
          if (!fallbackResp.ok) { skipped++; continue; }
          
          const fbData = await fallbackResp.json();
          const fbProds = fbData.Includes?.Products || {};
          const fbKeys = Object.keys(fbProds);
          if (fbKeys.length === 0) { skipped++; continue; }
          
          const fbProd = fbProds[fbKeys[0]];
          const fbName = fbProd?.Description || fbProd?.Name;
          if (!isRealName(fbName, prod.model_number)) { skipped++; continue; }
          
          const cat = mapCategory(fbProd?.CategoryId, fbName) || prod.category;
          await supabase.from("products").update({
            display_name: fbName.slice(0, 255),
            category: cat !== "General" ? cat : prod.category,
            updated_at: new Date().toISOString(),
          }).eq("id", prod.id);
          updated++;
          results.push({ model: prod.model_number, name: fbName.slice(0, 80), category: cat });
          continue;
        }

        const bvData = await resp.json();
        const bvResults = bvData.Results || [];
        
        if (bvResults.length === 0) {
          // No product found in BV — update with model number as name to stop retrying
          const modelCat = mapCategory(undefined, prod.model_number);
          await supabase.from("products").update({
            display_name: `LG ${prod.model_number}`,
            category: modelCat || prod.category,
            updated_at: new Date().toISOString(),
          }).eq("id", prod.id);
          updated++;
          results.push({ model: prod.model_number, name: `LG ${prod.model_number}`, category: modelCat || prod.category });
          continue;
        }

        const bvProd = bvResults[0];
        // Priority: Description > Name > Brand+Name
        let realName = bvProd?.Description || bvProd?.Name;
        
        if (!realName) {
          realName = `LG ${prod.model_number}`;
        } else if (realName.length < 10 && bvProd?.Brand?.Name) {
          realName = `${bvProd.Brand.Name} ${realName}`;
        }

        const bvCatId = bvProd?.CategoryId;
        const mappedCategory = mapCategory(bvCatId, realName) || prod.category;

        if (i < 3) {
          console.log(`[${regionUpper}] ${prod.model_number} → Name: ${bvProd?.Name}, Desc: ${bvProd?.Description}, Cat: ${bvCatId}`);
        }

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

      if (i < products.length - 1) {
        await new Promise(r => setTimeout(r, 150));
      }
    }

    // Check remaining
    const { count: remaining } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("display_name", `LG Product (${regionUpper})`);

    console.log(`[${regionUpper}] Updated: ${updated}, Skipped: ${skipped}, Remaining: ${remaining}`);

    return new Response(
      JSON.stringify({
        region: regionUpper,
        processed: products.length,
        updated,
        skipped,
        remaining: remaining || 0,
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
