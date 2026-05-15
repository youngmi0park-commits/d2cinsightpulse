import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BV_BASE = "https://api.bazaarvoice.com/data";
const PAGE_SIZE = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { locale = "en_US" } = await req.json().catch(() => ({}));
  const LOCALE_KEY_MAP: Record<string, string> = {
    en_US: "BAZAARVOICE_US_API_KEY",
    en_GB: "BAZAARVOICE_UK_API_KEY",
    en_IN: "BAZAARVOICE_IN_API_KEY",
    zh_TW: "BAZAARVOICE_TW_API_KEY",
    ja_JP: "BAZAARVOICE_JP_API_KEY",
    th_TH: "BAZAARVOICE_TH_API_KEY",
    de_DE: "BAZAARVOICE_DE_API_KEY",
    en_AU: "BAZAARVOICE_AU_API_KEY",
    pt_BR: "BAZAARVOICE_BR_API_KEY",
    es_ES: "BAZAARVOICE_ES_API_KEY",
    es_MX: "BAZAARVOICE_MX_API_KEY",
    es_PE: "BAZAARVOICE_PE_API_KEY",
    ar_SA: "BAZAARVOICE_SA_API_KEY",
    en_CA: "BAZAARVOICE_CA_API_KEY",
    vi_VN: "BAZAARVOICE_VN_API_KEY",
  };
  const passkey = Deno.env.get(LOCALE_KEY_MAP[locale] ?? "BAZAARVOICE_US_API_KEY")!;
  console.log("[BV-SWEEP] using key tail=..." + (passkey ? passkey.slice(-8) : "MISSING") + " len=" + (passkey?.length ?? 0));

  if (!passkey) {
    return new Response(JSON.stringify({ success: false, error: "Missing BV API key for " + locale }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let totalProducts = 0;
  let registered = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(BV_BASE + "/products.json");
    url.searchParams.set("apiversion", "5.4");
    url.searchParams.set("passkey", passkey);
    url.searchParams.set("Locale", locale);
    url.searchParams.set("Limit", String(PAGE_SIZE));
    url.searchParams.set("Offset", String((page - 1) * PAGE_SIZE));
    url.searchParams.set("Filter", "IsActive:true");
    url.searchParams.set("Stats", "Reviews");
    url.searchParams.set("Include", "Categories");

    console.log("[BV-SWEEP] page=" + page + " locale=" + locale);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      console.error("[BV-SWEEP] API error " + res.status + ": " + body.slice(0, 300));
      if (res.status === 429) { await new Promise(r => setTimeout(r, 3000)); continue; }
      break;
    }

    const data = await res.json();
    const products = data.Results ?? [];
    totalProducts = data.TotalResults ?? totalProducts;
    console.log("[BV-SWEEP] resp locale=" + locale + " status=" + res.status + " TotalResults=" + data.TotalResults + " HasErrors=" + data.HasErrors + " err=" + (data.Errors?.[0]?.Message ?? ""));

    if (products.length === 0) break;

    for (const p of products) {
      const reviewCount = p.ReviewStatistics?.TotalReviewCount ?? 0;
      if (reviewCount === 0) continue;

      const { error } = await supabase
        .from("bv_collection_progress")
        .upsert({
          locale,
          product_id: p.Id,
          product_name: p.Name ?? "",
          category: p.CategoryId ?? "Uncategorized",
          total_available: reviewCount,
          updated_at: new Date().toISOString(),
        }, { onConflict: "locale,product_id", ignoreDuplicates: false });

      if (!error) registered++;
    }

    hasMore = products.length === PAGE_SIZE && (page * PAGE_SIZE) < totalProducts;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }

  return new Response(
    JSON.stringify({ success: true, locale, totalProducts, registered }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
