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

// Order matters: more specific rules first.
// Synced with src/lib/categoryInference.ts — broadened with KR/global model patterns
// (GL-, GR-, GC-, GM-, F-series washers, S-series stylers/AC, numeric-prefixed TV/monitor codes, etc.)
const RULES: RuleSpec[] = [
  // Styler (check before Soundbar — S3/S5 conflicts)
  { category: "Styler", modelRegex: /^(S3[A-Z]|S5[A-Z])/i },
  { category: "Styler", nameRegex: /Styler/i },
  // Laptop
  { category: "Laptop", modelRegex: /^(13Z|14Z|15Z|16Z|17Z|14T|16T|17T)\d/i },
  { category: "Laptop", nameRegex: /\bgram\b|UltraPC|Laptop/i },
  // Monitor (numeric-prefixed display codes)
  { category: "Monitor", modelRegex: /^\d{2}(WP|WQ|WL|GP|GN|GR|GS|GL|MP|MN|MR|MQ|UP|UQ|UR|UN|UL|BP|BN|BR|BL|SR|SQ)/i },
  { category: "Monitor", nameRegex: /Monitor|UltraGear|UltraFine|UltraWide|DualUp/i },
  // TV (OLED / QNED / NanoCell / numeric-prefixed UH/UQ/UR/UN/UT codes)
  { category: "TV", modelRegex: /^(OLED|QNED|NANO\d|QN\d)/i },
  { category: "TV", modelRegex: /^\d{2,3}(OLED|QNED|NANO|UH|UQ|UR|UN|UT|US)/i },
  { category: "TV", nameRegex: /OLED|QNED|NanoCell|Smart TV|StanbyME/i },
  // Refrigerator (US LR-series + KR GL-/GR-/GC-/GM- series)
  { category: "Refrigerator", modelRegex: /^(LRMD|LRFD|LRFC|LRFV|LRFX|LRFG|LRSD|LRSE|LRSP|LRSC|LRSV|LRYK|LRYC|LRYX|LRMV|LRMW|LRMX|SRFV|LFCS|LFXS|LMXS|LBN\d|LF\d)/i },
  { category: "Refrigerator", modelRegex: /^(GL-[A-Z]?[BDFNPMTRS]|GR-[A-Z]|GC-[A-Z]|GM-[A-Z])/i },
  { category: "Refrigerator", nameRegex: /Refrigerator|Fridge|InstaView|French.?Door|냉장고/i },
  // Washer (US WM/WT + global F-series front loaders)
  { category: "Washer", modelRegex: /^(WM\d|WT\d|WKE|WKG|WKHC|WKEX|WKGX|WKHX|WKL|FV\d)/i },
  { category: "Washer", modelRegex: /^F\d+[A-Z]/i },
  { category: "Washer", nameRegex: /Washer|WashTower|WashCombo|Washing|세탁기/i },
  // Dryer
  { category: "Dryer", modelRegex: /^(DLE|DLG|DLEX|DLGX|DLHC|DLHX|RD\d)/i },
  { category: "Dryer", nameRegex: /\bDryer\b|건조기/i },
  // Dishwasher
  { category: "Dishwasher", modelRegex: /^(LDF|LDP|LDT|LDS|LSDT|LSDF|LDFN|LDFC|LSIL|DF[A-Z])/i },
  { category: "Dishwasher", nameRegex: /Dishwasher|QuadWash|식기세척기/i },
  // Microwave
  { category: "Microwave", modelRegex: /^(LMC|LMV|LMH|LMHM|MH\d|MS\d|MJ\d|MVE|MVEL)/i },
  { category: "Microwave", nameRegex: /Microwave|NeoChef|전자레인지/i },
  // Range / Oven
  { category: "Range/Oven", modelRegex: /^(LRE|LRG|LSE|LSG|LDE|LSRL|LSEL|LSGL|LSDL|LREL|LRGL|LWC|LWS|LWD)/i },
  { category: "Range/Oven", nameRegex: /\bRange\b|\bOven\b|Cooktop|오븐|레인지/i },
  // Air Conditioner (Artcool / DualCool / S-numeric portables)
  { category: "Air Conditioner", modelRegex: /^(LW\d|LP\d|LMU|LSN|LAN|LAU|LSU|S\d+Q)/i },
  { category: "Air Conditioner", nameRegex: /Air Conditioner|DualCool|Artcool|에어컨/i },
  // Air Purifier
  { category: "Air Purifier", modelRegex: /^(AS\d|AP\d|AM\d)/i },
  { category: "Air Purifier", nameRegex: /Purifier|PuriCare|공기청정기/i },
  // Soundbar / Audio
  { category: "Audio", modelRegex: /^(SK\d|SL\d|SN\d|SP\d|SH\d|SJ\d|SQC|SC9|USC|USE|DSC|XBOOM|XG\d|XL\d|RG\d|RP\d|XO\d|OL\d|ON\d|OK\d|RN\d|PL\d|PN\d|PK\d|S\d{2}[A-Z])/i },
  { category: "Audio", nameRegex: /Soundbar|XBOOM|Speaker|사운드바|오디오/i },
  // Vacuum
  { category: "Vacuum", modelRegex: /^(A9|R9|VR\d|VK\d|A\d{2}[A-Z])/i },
  { category: "Vacuum", nameRegex: /Vacuum|CordZero|청소기/i },
  // Projector
  { category: "Projector", modelRegex: /^(HU\d|PF\d|PH\d|PG\d|HF\d)/i },
  { category: "Projector", nameRegex: /Projector|CineBeam|프로젝터/i },
];

/**
 * Many legacy products store an internal ID (e.g. "MD05015940") in `model_number`,
 * while the *real* model code lives inside `display_name` (e.g. "LG Electronics DLE1101W").
 * Extract the most likely model token from display_name as a fallback.
 */
function extractModelFromName(name: string): string {
  if (!name) return "";
  const cleaned = name.replace(/^LG(\s+Electronics)?\s+/i, "").trim();
  const firstToken = cleaned.split(/\s+/)[0] ?? "";
  return firstToken;
}

function classify(model: string, name: string): string | null {
  const candidates = [model, extractModelFromName(name)].filter(Boolean);
  for (const rule of RULES) {
    if (rule.modelRegex) {
      for (const c of candidates) {
        if (rule.modelRegex.test(c)) return rule.category;
      }
    }
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
