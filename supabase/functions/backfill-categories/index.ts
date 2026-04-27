import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BV_BASE = "https://api.bazaarvoice.com/data";

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
  TV: "TV", "OLED TV": "TV", OLED: "TV", Washer: "Washer",
  "Washing Machine": "Washer", Refrigerator: "Refrigerator", Dryer: "Dryer",
  Monitor: "Monitor", Audio: "Audio", Soundbar: "Audio",
  "Air Conditioner": "Air Conditioner", "LG art cool": "Air Conditioner",
  Laptop: "Laptop", "Air Purifier": "Air Purifier", Microwave: "Microwave",
  Projector: "Projector", Dishwasher: "Dishwasher", Vacuum: "Vacuum",
  "Robot Vacuum": "Vacuum", Styler: "Styler", "Range/Oven": "Range/Oven",
  Range: "Range/Oven", Cooking: "Range/Oven", Accessory: "Accessory",
  Accessories: "Accessory", Cooktop: "Cooktop",
};

// ── Model-number regex fallback ──
function inferCategoryFromModel(model: string): string | null {
  const m = model.toUpperCase();
  // Accessories first (specific prefixes)
  if (/^(AKB|AGF|AN-|MAZ|AAA|ADQ|SP-|MCK|AEB|EAU|MDS|MDJ|ABW|KSTK)/.test(m)) return "Accessory";
  // Range/Oven
  if (/^(LREL|LRGL|LSGL|LSEL|LSE\d|LRE\d|LSDL|LSIS\d|LDG\d|LSDT|WSED|WSES|LDE\d|LWS\d)/.test(m)) return "Range/Oven";
  // Washer
  if (/^(WKEX|WKGX|WKE\d|WKG\d|WM\d|WT\d|WD\d|F[0-9]|FV\d|FW[A-Z]|SWWG|SWWE|SWWN|LWD\d|W4[A-Z])/.test(m)) return "Washer";
  // Dryer
  if (/^(DLEX|DLE\d|DLG\d|DLGX|RH\d|RD\d)/.test(m)) return "Dryer";
  // Microwave
  if (/^(MVEM|MVEL|MH\d|MS\d|MC\d|LMC|LMV|LMH|MHEC|MHES|LMVM|MK\d|MSER|MJ\d)/.test(m)) return "Microwave";
  // Dishwasher
  if (/^(LDFN|LDF\d|LDT\d|LDP\d|UD50|SDWB|LDNP[HMT]|LDFC|LDPS|DF[0-9A-Z]{3}|DFB|DFC)/.test(m)) return "Dishwasher";
  // Refrigerator (extensive patterns)
  if (/^(LRFX|LRYX|LRDC|LF\d|LRMV|LRFG|LFDS|LRYKS|LRYKC|LRYXC|LRFWS|LRSXS|LSHD|LRFVC|LSXC|LFC\d|SRFVC|LSDS|LDCS|LRFS|LRGN|LTGL|LMWS|LSFXC|LHFS|LRBCC|LCFS|LTNC|LFCC|LLSR|LRMXC|LRMXS|LRMVC|LRSOS|LRSDS|LBNC|LTCS|LRFLS|LRFOC|LMXS|LMXC|LFX\d|LFXS|LSXS|GR[A-Z]|GM[A-Z]|GC[A-Z]|GS[A-Z]|GN[A-Z]|GF[A-Z]|GB[A-Z]|GW[A-Z]|GT[A-Z])/.test(m)) return "Refrigerator";
  // TV (numeric prefix patterns)
  if (/^\d+(UT|UQ|UR|UH|UP|UA|UB|SM|SK|SJ|SN|LQ|LJ|LP|LM|LB|LF|LH|LN|LY|LA|LE|LV|UF|UM|UJ|NANO|QNED|OLED)\d/.test(m)) return "TV";
  // Monitor (numeric prefix patterns)
  if (/^\d+(G[SXPNQL0-9]\d|W[PQNK]\d|SR\d|MQ\d|MK\d|BK\d|BN\d|MP\d|UC\d|U[NK0-9]\d{2}[A-Z]|MS\d{3})/.test(m)) return "Monitor";
  // Vacuum
  if (/^A9[0-9A-Z]/.test(m)) return "Vacuum";
  // Styler
  if (/^(S3[A-Z]|S5[A-Z])/.test(m)) return "Styler";
  // Air Conditioner
  if (/^(LW\d|LP\d|LU[A-Z]|LUWM)/.test(m)) return "Air Conditioner";
  // Air Purifier
  if (/^(AS\d|AM5)/.test(m)) return "Air Purifier";
  // Laptop (gram)
  if (/^\d+Z\d+/.test(m) || /^\d+T\d+[A-Z]+-/.test(m)) return "Laptop";
  // Audio
  if (/^(SP\d|SN\d|SC\d|SK\d|SL\d|SJ\d|SH\d|SE\d|SD\d|LHB|SPD|LAS|LAC|NP\d|HBS|SA-|OLW|QP\d|S\d{2}[A-Z])/.test(m)) return "Audio";
  // Projector
  if (/^(PF|PH|HU|HF)/.test(m)) return "Projector";
  // Cooktop
  if (/^(CBIH|CBGJ|CBGS|LSCE)/.test(m)) return "Cooktop";
  return null;
}

// ── Display-name based inference ──
function inferCategoryFromDisplayName(displayName: string): string | null {
  const upper = displayName.toUpperCase();
  // Phone/tablet → null (deactivate separately)
  if (/\b(PHONE|CELULAR|THINQ APP|ANDROID)\b/i.test(displayName)) return null;
  // Washer
  if (/^(WM\d|WT\d|WD\d|F\d[A-Z]|FV\d|FW[A-Z]|SWWG|SWWE)/.test(displayName)) return "Washer";
  if (upper.includes("WASHER") || upper.includes("WASHING MACHINE") || upper.includes("WASHTOWER")) return "Washer";
  if (/^\d+kg.*wash/i.test(displayName)) return "Washer";
  // Dryer
  if (/^(DLE\d|DLG\d|DLEX|DLGX)/.test(displayName)) return "Dryer";
  if (upper.includes("DRYER") && !upper.includes("COMBO")) return "Dryer";
  // Refrigerator
  if (/^(LRFX|LRYX|LRDC|LRMV|LRFG|LFDS|LFX|LFXS|LMXS|LSXS)/.test(displayName)) return "Refrigerator";
  if (upper.includes("FRIDGE") || upper.includes("FREEZER") || upper.includes("REFRIGER") || upper.includes("INSTAVIEW")) return "Refrigerator";
  // Range/Oven
  if (/^(LREL|LRGL|LSE\d|LRE\d|LSDL|LSIS\d)/.test(displayName)) return "Range/Oven";
  // TV
  if (upper.includes("SMART TV") && !upper.includes("MONITOR")) return "TV";
  if (/OLED\s*EVO/i.test(displayName) && !upper.includes("MONITOR")) return "TV";
  if (/^OLED\d+C\d/i.test(displayName)) return "TV";
  if (upper.includes("NANOCELL") || upper.includes("QNED") || upper.includes("STANBYME")) return "TV";
  // Monitor
  if (upper.includes("ULTRAGEAR") || upper.includes("ULTRAFINE") || upper.includes("ULTRAWIDE")) return "Monitor";
  if (upper.includes("DUALUP") || upper.includes("MYVIEW") || upper.includes("SMART MONITOR")) return "Monitor";
  // Audio
  if (upper.includes("SOUNDBAR") || upper.includes("SOUND BAR") || upper.includes("XBOOM") || upper.includes("TONE FREE")) return "Audio";
  // Laptop
  if (upper.includes("LG GRAM") || /^\d+Z\d+/.test(displayName) || /^\d+T\d+[A-Z]+-/.test(displayName)) return "Laptop";
  // Vacuum
  if (upper.includes("VACUUM") || upper.includes("CORDZERO")) return "Vacuum";
  // Dishwasher
  if (upper.includes("DISHWASH") || upper.includes("QUADWASH")) return "Dishwasher";
  // Air Conditioner
  if (upper.includes("AIR CONDITION") || upper.includes("ARTCOOL")) return "Air Conditioner";
  // Air Purifier
  if (upper.includes("PURIFIER") || upper.includes("PURICARE") || upper.includes("AERO TOWER")) return "Air Purifier";
  // Microwave
  if (upper.includes("MICROWAVE")) return "Microwave";
  // Projector
  if (upper.includes("PROJECTOR") || upper.includes("CINEBEAM")) return "Projector";
  // Styler
  if (upper.includes("STYLER") || upper.includes("STEAM CLOSET")) return "Styler";
  return null;
}

// ── Infer TV sub_category ──
function inferTvSubCategory(displayName: string, modelNumber: string): string {
  const upper = displayName.toUpperCase();
  const m = modelNumber.toUpperCase();
  if (upper.includes("STANBYME") || upper.includes("STANBY ME")) return "StanbyME";
  if (upper.includes("OLED EVO") || /OLED\d+[CGM]\d/.test(m)) return "OLED evo";
  if (upper.includes("OLED") || /OLED\d+B\d/.test(m)) return "OLED";
  if (upper.includes("QNED") || /QNED/.test(m)) return "QNED";
  if (upper.includes("NANOCELL") || /NANO\d/.test(m)) return "NanoCell";
  if (upper.includes("8K") || /^\d+Z\d/.test(m)) return "8K";
  if (upper.includes("FLEX") || upper.includes("EASEL") || upper.includes("OBJET")) return "Lifestyle";
  return "UHD";
}

// ── Infer Monitor sub_category ──
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

  let updated = 0, modelInferred = 0, bvResolved = 0, stillGeneral = 0;

  // Pass 1: model-number + display-name inference
  for (const prod of generalProducts) {
    const inferred = inferCategoryFromModel(prod.model_number)
      || inferCategoryFromDisplayName(prod.display_name);
    if (inferred) {
      const updateObj: Record<string, string> = { category: inferred };
      if (inferred === "Monitor") updateObj.sub_category = inferMonitorSubCategory(prod.display_name);
      if (inferred === "TV") updateObj.sub_category = inferTvSubCategory(prod.display_name, prod.model_number);
      await supabase.from("products").update(updateObj).eq("id", prod.id);
      modelInferred++;
      updated++;
    }
  }

  // Pass 2: BV API lookup for remaining MD* products
  const needsBV = generalProducts.filter(p => {
    const inferred = inferCategoryFromModel(p.model_number) || inferCategoryFromDisplayName(p.display_name);
    return !inferred && p.model_number.startsWith("MD");
  });

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
          i -= BV_BATCH;
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

        const betterName = bvProd.Name || dbProd.display_name;
        const resolved = normalizeCategory(catId, dbProd.model_number, betterName);

        if (resolved !== "General") {
          const updateObj: Record<string, string> = { category: resolved, display_name: betterName };
          if (resolved === "Monitor") updateObj.sub_category = inferMonitorSubCategory(betterName);
          if (resolved === "TV") updateObj.sub_category = inferTvSubCategory(betterName, dbProd.model_number);
          await supabase.from("products").update(updateObj).eq("id", dbProd.id);
          bvResolved++;
          updated++;
        } else {
          if (catId) console.log("[BACKFILL] Unknown BV CategoryId: " + catId + " for " + dbProd.model_number);
          stillGeneral++;
        }
      }

      for (const dbProd of batch) {
        if (!results.find((r: any) => r.Id === dbProd.model_number)) stillGeneral++;
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error("[BACKFILL] Error: " + (e as Error).message);
    }
  }

  const { count: remaining } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category", "General")
    .eq("is_active", true);

  return new Response(JSON.stringify({
    success: true, locale,
    processed: generalProducts.length, updated, modelInferred, bvResolved, stillGeneral,
    remaining: remaining ?? 0,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
