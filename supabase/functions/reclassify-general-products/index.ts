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
  // Styler (check before Audio — S3/S5 conflicts)
  { category: "Styler", modelRegex: /^(S3[A-Z]|S5[A-Z])/i },
  { category: "Styler", nameRegex: /Styler|스타일러/i },
  // Laptop
  { category: "Laptop", modelRegex: /^(13Z|14Z|15Z|16Z|17Z|14T|16T|17T)\d/i },
  { category: "Laptop", nameRegex: /\bgram\b|UltraPC|Laptop|노트북/i },
  // Projector (KR: BPM, BPV, HU, PF, PH, PG, HF, AU810, CineBeam)
  { category: "Projector", modelRegex: /^(HU\d|PF\d|PH\d|PG\d|HF\d|BPM\d|BPV\d|AU\d{3}P|BU\d{2,})/i },
  { category: "Projector", nameRegex: /Projector|CineBeam|프로젝터/i },
  // Monitor — broadened: \d{2,3} + display-suffix codes (incl. KR ART, MK, MN, MJ, MR, MS, MT, MD, MS, ML, MB, ML)
  { category: "Monitor", modelRegex: /^\d{2,3}(WP|WQ|WL|WR|WK|WN|GP|GN|GR|GS|GL|GQ|GX|GK|MP|MN|MR|MQ|MS|MT|MK|ML|MB|MD|MJ|UP|UQ|UR|UN|UL|UK|BP|BN|BR|BL|BK|SR|SQ|SP|SK|ART)/i },
  { category: "Monitor", modelRegex: /^(LG\s*)?\d{2,3}(M|G|U|W|B|S)\d/i },
  { category: "Monitor", nameRegex: /Monitor|UltraGear|UltraFine|UltraWide|DualUp|모니터/i },
  // TV (OLED / QNED / NanoCell / numeric-prefixed UH/UQ/UR/UN/UT codes; KR LH/LL/LM/LJ TV codes)
  { category: "TV", modelRegex: /^(OLED|QNED|NANO\d|QN\d)/i },
  { category: "TV", modelRegex: /^\d{2,3}(OLED|QNED|NANO|UH|UQ|UR|UN|UT|US|LH|LM|LJ|LK|LF|LB|LE|LN|LX|LY|LZ|NU|UK|UJ|SK|SJ|SM|SH)/i },
  { category: "TV", modelRegex: /^(LH|LL)\d{2}/i },
  { category: "TV", nameRegex: /OLED|QNED|NanoCell|Smart TV|StanbyME|TV(?!\w)/i },
  // Refrigerator (US LR/LF/LM/LB + KR GR/GC/GM/GL/GS/GA/GB/B-AWY/D-G + JP)
  { category: "Refrigerator", modelRegex: /^(LRMD|LRFD|LRFC|LRFV|LRFX|LRFG|LRSD|LRSE|LRSP|LRSC|LRSV|LRYK|LRYC|LRYX|LRMV|LRMW|LRMX|SRFV|LFCS|LFXS|LMXS|LBN\d|LF\d|LFC|LMX|LSC|LSX)/i },
  { category: "Refrigerator", modelRegex: /^(GL-[A-Z]?[BDFNPMTRS]|GR-[A-Z]|GC-[A-Z]|GM-[A-Z]|GS-[A-Z]|GA-[A-Z]|GB-[A-Z]|GT-[A-Z])/i },
  { category: "Refrigerator", modelRegex: /^B\d{2}AWY/i },
  { category: "Refrigerator", nameRegex: /Refrigerator|Fridge|InstaView|French.?Door|냉장고/i },
  // Washer (US WM/WT + global F-series + KR FB/FH/T-series + BR FV)
  { category: "Washer", modelRegex: /^(WM\d|WT\d|WKE|WKG|WKHC|WKEX|WKGX|WKHX|WKL|FV\d|FH\d|FB\d|TH\d{3}|T\d{2}[A-Z]\d)/i },
  { category: "Washer", modelRegex: /^F\d+[A-Z]/i },
  { category: "Washer", nameRegex: /Washer|WashTower|WashCombo|Washing|세탁기/i },
  // Dryer (KR RC/RH series, US DLE/DLG)
  { category: "Dryer", modelRegex: /^(DLE|DLG|DLEX|DLGX|DLHC|DLHX|RD\d|RC\d{2}|RH\d{2})/i },
  { category: "Dryer", nameRegex: /\bDryer\b|건조기/i },
  // Dishwasher (KR DD/DF + US LDF/LDP/LDT)
  { category: "Dishwasher", modelRegex: /^(LDF|LDP|LDT|LDS|LSDT|LSDF|LDFN|LDFC|LSIL|DF[A-Z]|DD\d{2}[A-Z])/i },
  { category: "Dishwasher", nameRegex: /Dishwasher|QuadWash|식기세척기/i },
  // Microwave (KR MS/MJ/MH + US LMC/LMV)
  { category: "Microwave", modelRegex: /^(LMC|LMV|LMH|LMHM|MH\d|MS\d|MJ\d|MVE|MVEL|MW\d)/i },
  { category: "Microwave", nameRegex: /Microwave|NeoChef|전자레인지/i },
  // Range / Oven / Cooktop (KR BCI/BWH/BO/EG built-in oven & cooktop, US LRE/LSE)
  { category: "Range/Oven", modelRegex: /^(LRE|LRG|LSE|LSG|LDE|LSRL|LSEL|LSGL|LSDL|LREL|LRGL|LWC|LWS|LWD|BCI\d|BWH\d|BO\d{3}|EG\d{3})/i },
  { category: "Range/Oven", nameRegex: /\bRange\b|\bOven\b|Cooktop|오븐|레인지|쿡탑/i },
  // Air Conditioner (KR DC-RK portables, ART-cool, S-numeric, DB split, US LW/LP)
  { category: "Air Conditioner", modelRegex: /^(LW\d|LP\d|LMU|LSN|LAN|LAU|LSU|S\d+Q|DC\d{2}RK|DB\d{3}TX|D\d{2}[A-Z]K|AC\d{2}[A-Z]K)/i },
  { category: "Air Conditioner", nameRegex: /Air.?Conditioner|DualCool|Artcool|에어컨/i },
  // Air Purifier (KR AS/AP/AM + PuriCare)
  { category: "Air Purifier", modelRegex: /^(AS\d|AP\d|AM\d|PS\d{2}[A-Z])/i },
  { category: "Air Purifier", nameRegex: /Purifier|PuriCare|공기청정기/i },
  // Vacuum (KR CV/VK/VR/VS A9 cordless, US A9/R9)
  { category: "Vacuum", modelRegex: /^(A9|R9|VR\d|VK\d|VS\d|CV\d{4}|A\d{2}[A-Z])/i },
  { category: "Vacuum", nameRegex: /Vacuum|CordZero|청소기/i },
  // Soundbar / Audio (KR SP/SK/SL/SN/SH/SJ + Buds/Tone Free/XBOOM CK/CJ/CL/CM/CQS/OK/OL/ON/RG/RP/XG/XL)
  { category: "Audio", modelRegex: /^(SK\d|SL\d|SN\d|SP\d|SH\d|SJ\d|SQC|SC9|USC|USE|DSC|XBOOM|XG\d|XL\d|RG\d|RP\d|XO\d|OL\d|ON\d|OK\d|RN\d|PL\d|PN\d|PK\d|CK\d|CJ\d|CL\d{2}|CM\d|CQS|TONE|HBS|FH\d{2}|S\d{2}[A-Z])/i },
  { category: "Audio", modelRegex: /^BUDS/i },
  { category: "Audio", nameRegex: /Soundbar|XBOOM|Speaker|Tone.?Free|Earbud|사운드바|오디오|이어버드/i },
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
