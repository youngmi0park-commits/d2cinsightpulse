import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RuleSpec {
  category: string;
  modelRegex?: RegExp;
  nameRegex?: RegExp;
}

// Order matters: more specific rules first
const RULES: RuleSpec[] = [
  // Laptop
  { category: "Laptop", modelRegex: /^(13Z|14Z|15Z|16Z|17Z|14T|16T|17T)/i },
  { category: "Laptop", nameRegex: /\bgram\b|UltraPC|Laptop/i },
  // Monitor
  { category: "Monitor", modelRegex: /^[0-9]{2}(WP|WQ|GP|GN|GR|GS|MP|MN|MR|UP|UQ|UR|UN|BP|BN|BR|BL|MQ|GL|UL|WL|SR|SQ)/i },
  { category: "Monitor", nameRegex: /Monitor|UltraGear|UltraFine|UltraWide|DualUp/i },
  // TV
  { category: "TV", modelRegex: /^(OLED|UH[0-9]|UQ[0-9]|UR[0-9]|UN[0-9]|US[0-9]|QNED|NANO[0-9]|QN[0-9])/i },
  { category: "TV", nameRegex: /OLED|QNED|NanoCell|Smart TV/i },
  // Refrigerator
  { category: "Refrigerator", modelRegex: /^(LRMD|LRFD|LRFC|LRFV|LRFX|LRSD|LRSE|LRSP|LRSC|LRYK|LRYC|LRMV|LRMW|LRMX|LRSV|SRFV|LFCS|LFXS|LMXS|LBN[0-9])/i },
  { category: "Refrigerator", nameRegex: /Refrigerator|Fridge|InstaView/i },
  // Washer
  { category: "Washer", modelRegex: /^(WM[0-9]|WT[0-9]|WKE|WKG|WKHC|WKEX|WKGX|WKHX|WKL)/i },
  { category: "Washer", nameRegex: /Washer|WashTower|WashCombo|Washing/i },
  // Dryer
  { category: "Dryer", modelRegex: /^(DLE|DLG|DLEX|DLGX|DLHC|DLHX)/i },
  { category: "Dryer", nameRegex: /\bDryer\b/i },
  // Dishwasher
  { category: "Dishwasher", modelRegex: /^(LDF|LDP|LDT|LDS|LSDT|LSDF|LDFN|LDFC|LSIL)/i },
  { category: "Dishwasher", nameRegex: /Dishwasher|QuadWash/i },
  // Microwave
  { category: "Microwave", modelRegex: /^(LMC|LMV|LMH|LMHM|MH[0-9]|MS[0-9]|MJ[0-9])/i },
  { category: "Microwave", nameRegex: /Microwave|NeoChef/i },
  // Range
  { category: "Range", modelRegex: /^(LRE|LRG|LSE|LSG|LSRL|LSEL|LSGL|LSDL|LREL|LRGL|LWC|LWS|LWD)/i },
  { category: "Range", nameRegex: /\bRange\b|\bOven\b|Cooktop/i },
  // AC
  { category: "AC", modelRegex: /^(LW[0-9]|LP[0-9]|LMU|LSN|LAN|LAU|LSU)/i },
  { category: "AC", nameRegex: /Air Conditioner|DualCool|Artcool/i },
  // Soundbar / Audio
  { category: "Soundbar", modelRegex: /^(SK[0-9]|SL[0-9]|SN[0-9]|SP[0-9]|SH[0-9]|SJ[0-9]|SQC|SC9|USC|USE|DSC|XBOOM|XG[0-9]|XL[0-9]|RG[0-9]|RP[0-9]|XO[0-9]|OL[0-9]|ON[0-9]|OK[0-9]|RN[0-9]|PL[0-9]|PN[0-9]|PK[0-9])/i },
  { category: "Soundbar", nameRegex: /Soundbar|XBOOM|Speaker/i },
  // Vacuum
  { category: "Vacuum", modelRegex: /^(A9|R9|VR[0-9]|VK[0-9])/i },
  { category: "Vacuum", nameRegex: /Vacuum|CordZero/i },
  // Air Purifier
  { category: "Air Purifier", modelRegex: /^(AS[0-9]|AP[0-9]|AM[0-9])/i },
  { category: "Air Purifier", nameRegex: /Purifier|PuriCare/i },
  // Projector
  { category: "Projector", modelRegex: /^(HU[0-9]|PF[0-9]|PH[0-9]|PG[0-9]|HF[0-9])/i },
  { category: "Projector", nameRegex: /Projector|CineBeam/i },
];

function classify(model: string, name: string): string | null {
  for (const rule of RULES) {
    if (rule.modelRegex && rule.modelRegex.test(model)) return rule.category;
    if (rule.nameRegex && rule.nameRegex.test(name)) return rule.category;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = !!body?.dryRun;
    } catch (_) {
      // no body — proceed with real run
    }

    // Fetch all uncategorized products in batches
    const allProducts: { id: string; model_number: string; display_name: string }[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("products")
        .select("id, model_number, display_name")
        .or("category.eq.General,category.is.null")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allProducts.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // Classify
    const updates: Record<string, { ids: string[]; sample: string[] }> = {};
    for (const p of allProducts) {
      const cat = classify(p.model_number || "", p.display_name || "");
      if (!cat) continue;
      if (!updates[cat]) updates[cat] = { ids: [], sample: [] };
      updates[cat].ids.push(p.id);
      if (updates[cat].sample.length < 3) {
        updates[cat].sample.push(`${p.model_number} (${p.display_name})`);
      }
    }

    const summary: Record<string, { count: number; sample: string[] }> = {};
    for (const [cat, info] of Object.entries(updates)) {
      summary[cat] = { count: info.ids.length, sample: info.sample };
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          totalScanned: allProducts.length,
          plannedUpdates: summary,
        }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Execute updates per category in chunks of 500 IDs
    const results: Record<string, number> = {};
    for (const [cat, info] of Object.entries(updates)) {
      let updated = 0;
      for (let i = 0; i < info.ids.length; i += 500) {
        const chunk = info.ids.slice(i, i + 500);
        const { error, count } = await supabase
          .from("products")
          .update({ category: cat, updated_at: new Date().toISOString() }, { count: "exact" })
          .in("id", chunk);
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message, partialResults: results }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        updated += count || chunk.length;
      }
      results[cat] = updated;
    }

    const totalUpdated = Object.values(results).reduce((s, v) => s + v, 0);
    return new Response(
      JSON.stringify({
        success: true,
        totalScanned: allProducts.length,
        totalUpdated,
        breakdown: results,
        sample: summary,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
