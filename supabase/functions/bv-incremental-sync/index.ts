import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BV_BASE = "https://api.bazaarvoice.com/data";
const PAGE_SIZE = 100;

function sanitizePII(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    .replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[phone]")
    .replace(/\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct)\b\.?/gi, "[address]")
    .replace(/(?:my name is|I'm)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi, "[name]");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const locales = [
    { locale: "en_US", region: "us", key: Deno.env.get("BAZAARVOICE_US_API_KEY")! },
    { locale: "en_GB", region: "uk", key: Deno.env.get("BAZAARVOICE_UK_API_KEY")! },
    { locale: "en_IN", region: "in", key: Deno.env.get("BAZAARVOICE_IN_API_KEY")! },
    { locale: "zh_TW", region: "tw", key: Deno.env.get("BAZAARVOICE_TW_API_KEY")! },
    { locale: "ja_JP", region: "jp", key: Deno.env.get("BAZAARVOICE_JP_API_KEY")! },
    { locale: "th_TH", region: "th", key: Deno.env.get("BAZAARVOICE_TH_API_KEY")! },
    { locale: "de_DE", region: "de", key: Deno.env.get("BAZAARVOICE_DE_API_KEY")! },
    { locale: "en_AU", region: "au", key: Deno.env.get("BAZAARVOICE_AU_API_KEY")! },
    { locale: "pt_BR", region: "br", key: Deno.env.get("BAZAARVOICE_BR_API_KEY")! },
    { locale: "es_ES", region: "es", key: Deno.env.get("BAZAARVOICE_ES_API_KEY")! },
    { locale: "es_MX", region: "mx", key: Deno.env.get("BAZAARVOICE_MX_API_KEY")! },
    { locale: "es_PE", region: "pe", key: Deno.env.get("BAZAARVOICE_PE_API_KEY")! },
    { locale: "ar_SA", region: "sa", key: Deno.env.get("BAZAARVOICE_SA_API_KEY")! },
  ].filter(l => !!l.key);

  // Reviews submitted in the last 25 hours
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString().split("T")[0];
  let totalInserted = 0;
  let totalSkipped = 0;
  const productCache: Record<string, string> = {};

  for (const { locale, region, key } of locales) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(BV_BASE + "/reviews.json");
      url.searchParams.set("apiversion", "5.4");
      url.searchParams.set("passkey", key);
      url.searchParams.set("Locale", locale);
      url.searchParams.set("Limit", String(PAGE_SIZE));
      url.searchParams.set("Offset", String(offset));
      url.searchParams.set("Sort", "SubmissionTime:desc");
      url.searchParams.set("Include", "Products");
      // Filter: submitted after `since`
      const sinceTs = Math.floor(new Date(since).getTime() / 1000);
      url.searchParams.set("Filter", "SubmissionTime:gte:" + sinceTs);

      const res = await fetch(url.toString());
      if (!res.ok) {
        if (res.status === 429) { await new Promise(r => setTimeout(r, 3000)); continue; }
        break;
      }

      const data = await res.json();
      const reviews = data.Results ?? [];
      if (reviews.length === 0) break;

      for (const rv of reviews) {
        const reviewText = (rv.ReviewText as string) ?? "";
        if (reviewText.trim().length < 20) { totalSkipped++; continue; }

        const externalId = "bv_" + region + "_" + rv.Id;

        // Check existing
        const { data: existing } = await supabase
          .from("reviews").select("id").eq("external_id", externalId).maybeSingle();
        if (existing) { totalSkipped++; continue; }

        const rating = Number(rv.Rating) || null;
        let sentiment = "neutral";
        let sentimentScore = 0.5;
        if (rating !== null) {
          if (rating >= 4) { sentiment = "positive"; sentimentScore = 0.7 + (rating - 4) * 0.15; }
          else if (rating <= 2) { sentiment = "negative"; sentimentScore = 0.1 + (rating - 1) * 0.15; }
        }

        const safeContent = sanitizePII(reviewText).slice(0, 2000);
        const originalName = rv.OriginalProductName || "";
        const modelNum = originalName && !originalName.startsWith("MD")
          ? originalName : rv.ProductId || "LG-GENERIC";
        const displayName = rv.Products?.[rv.ProductId]?.Name || "LG Product";
        const category = rv.Products?.[rv.ProductId]?.CategoryId || "General";

        if (!productCache[modelNum]) {
          const { data: ex } = await supabase
            .from("products").select("id").eq("model_number", modelNum).maybeSingle();
          if (ex) {
            productCache[modelNum] = ex.id;
          } else {
            const { data: np } = await supabase
              .from("products")
              .insert({ model_number: modelNum, display_name: displayName, category })
              .select("id").single();
            if (np) productCache[modelNum] = np.id;
          }
        }
        const dbProductId = productCache[modelNum];
        if (!dbProductId) { totalSkipped++; continue; }

        let reviewType = "organic";
        if (rv.IsSyndicated === true || rv.SyndicationSource) reviewType = "syndication";

        await supabase.from("reviews").insert({
          product_id: dbProductId,
          source: "lge_com_" + region,
          source_url: "bazaarvoice://lg/" + rv.Id,
          external_id: externalId,
          title: rv.Title || null,
          content: safeContent,
          author: "LG Review User",
          rating, sentiment, sentiment_score: sentimentScore,
          published_at: rv.SubmissionTime?.split("T")[0] || null,
          emotion_category: sentiment === "positive" ? "satisfaction" : sentiment === "negative" ? "frustration" : "neutral",
          emotion_intensity: rating ? Math.min(5, Math.max(1, rating)) : 3,
          user_type: rv.BadgesOrder?.includes("verifiedPurchaser") ? "actual_user" : "unknown",
          content_type: "review",
          platform_type: "retailer",
          review_type: reviewType,
        });
        totalInserted++;
      }

      offset += reviews.length;
      hasMore = reviews.length === PAGE_SIZE;
      await new Promise(r => setTimeout(r, 250));
    }
  }

  return new Response(
    JSON.stringify({ success: true, totalInserted, totalSkipped }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
