import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALL_LOCALES = [
  { locale: "en_US", region: "us", keyName: "BAZAARVOICE_US_API_KEY" },
  { locale: "en_GB", region: "uk", keyName: "BAZAARVOICE_UK_API_KEY" },
  { locale: "en_IN", region: "in", keyName: "BAZAARVOICE_IN_API_KEY" },
  { locale: "zh_TW", region: "tw", keyName: "BAZAARVOICE_TW_API_KEY" },
  { locale: "ja_JP", region: "jp", keyName: "BAZAARVOICE_JP_API_KEY" },
  { locale: "th_TH", region: "th", keyName: "BAZAARVOICE_TH_API_KEY" },
  { locale: "de_DE", region: "de", keyName: "BAZAARVOICE_DE_API_KEY" },
  { locale: "en_AU", region: "au", keyName: "BAZAARVOICE_AU_API_KEY" },
];

const BV_BASE = "https://api.bazaarvoice.com/data";
const PAGE_SIZE = 100;
const SWEEP_DELAY = 300;
const COLLECT_BATCH = 50;       // ← 25 → 50 배치 확대
const COLLECT_DELAY = 250;

function sanitizePII(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    .replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[phone]")
    .replace(/\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct)\b\.?/gi, "[address]")
    .replace(/(?:my name is|I'm)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi, "[name]");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { mode = "full" } = await req.json().catch(() => ({}));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: Record<string, any> = {};
  const activeLocales = ALL_LOCALES.filter(l => !!Deno.env.get(l.keyName));

  // ── Locale rotation: 가장 오래 수집되지 않은 로캘을 먼저 처리 ──
  let sortedLocales = [...activeLocales];
  if (mode === "collect" || mode === "full") {
    // bv_collection_summary 뷰에서 로캘별 마지막 수집 시점 조회 → 오래된 로캘 우선
    const { data: summary } = await supabase
      .from("bv_collection_summary")
      .select("locale, last_run_at")
      .order("last_run_at", { ascending: true, nullsFirst: true });

    if (summary?.length) {
      const localeOrder = new Map<string, number>();
      summary.forEach((row: any, idx: number) => localeOrder.set(row.locale, idx));
      sortedLocales.sort((a, b) => {
        const aIdx = localeOrder.get(a.locale) ?? 999;
        const bIdx = localeOrder.get(b.locale) ?? 999;
        return aIdx - bIdx;
      });
    }
  }

  console.log(`[BV-AUTO] Starting mode=${mode}, ${sortedLocales.length} locales active, order: ${sortedLocales.map(l => l.locale).join(", ")}`);

  // ── PHASE 1: SWEEP (register products) ──
  if (mode === "sweep" || mode === "full") {
    for (const { locale, keyName } of sortedLocales) {
      const passkey = Deno.env.get(keyName)!;
      let page = 1;
      let hasMore = true;
      let registered = 0;
      let totalProducts = 0;

      try {
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

          const res = await fetch(url.toString());
          if (!res.ok) {
            if (res.status === 429) { await new Promise(r => setTimeout(r, 3000)); continue; }
            console.error(`[BV-AUTO] Sweep ${locale} error ${res.status}`);
            break;
          }

          const data = await res.json();
          const products = data.Results ?? [];
          totalProducts = data.TotalResults ?? totalProducts;

          if (products.length === 0) break;

          for (const p of products) {
            const reviewCount = p.ReviewStatistics?.TotalReviewCount ?? 0;
            if (reviewCount === 0) continue;

            // Sweep 시 total_available 업데이트 — 기존 complete 제품도 새 리뷰 추가 시 재오픈
            const { data: existing } = await supabase
              .from("bv_collection_progress")
              .select("total_available, total_collected, is_complete")
              .eq("locale", locale)
              .eq("product_id", p.Id)
              .maybeSingle();

            const shouldReopen = existing?.is_complete &&
              reviewCount > (existing?.total_available ?? 0);

            await supabase.from("bv_collection_progress").upsert({
              locale,
              product_id: p.Id,
              product_name: p.Name ?? "",
              category: p.CategoryId ?? "Uncategorized",
              total_available: reviewCount,
              // 새 리뷰가 추가된 경우 is_complete를 false로 재설정
              ...(shouldReopen ? { is_complete: false } : {}),
              updated_at: new Date().toISOString(),
            }, { onConflict: "locale,product_id", ignoreDuplicates: false });
            registered++;
          }

          hasMore = products.length === PAGE_SIZE && (page * PAGE_SIZE) < totalProducts;
          page++;
          await new Promise(r => setTimeout(r, SWEEP_DELAY));
        }
      } catch (e) {
        console.error(`[BV-AUTO] Sweep ${locale} failed:`, e);
      }

      results[`sweep_${locale}`] = { registered, totalProducts };
      console.log(`[BV-AUTO] Sweep ${locale}: ${registered} products registered`);
    }
  }

  // ── PHASE 2: COLLECT (batch collect reviews — 과거 포함 전량 수집) ──
  if (mode === "collect" || mode === "full") {
    const productCache: Record<string, string> = {};
    const startTime = Date.now();
    const TIME_BUDGET_MS = 130_000; // 130초 — 150초 타임아웃 전 여유

    for (const { locale, region, keyName } of sortedLocales) {
      // 시간 예산 초과 시 남은 로캘 스킵
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        console.log(`[BV-AUTO] Time budget exceeded (${Math.round((Date.now() - startTime)/1000)}s), skipping remaining locales`);
        break;
      }
      const passkey = Deno.env.get(keyName)!;
      let totalInserted = 0;
      let totalSkipped = 0;
      let productsDone = 0;

      // 카테고리 우선순위: 냉장고/세탁기/건조기 → 식기세척기/청소기/에어컨 → 기타 → TV
      const { data: products } = await supabase
        .rpc("get_bv_priority_products", { p_locale: locale, p_limit: COLLECT_BATCH });

      if (!products?.length) {
        results[`collect_${locale}`] = { message: "no pending products" };
        continue;
      }

      for (const prog of products) {
        if (Date.now() - startTime > TIME_BUDGET_MS) break;
        const bvProductId = prog.product_id;
        let offset = prog.last_offset ?? 0;
        let hasMore = true;
        let totalBV = prog.total_available;
        let prodInserted = 0;

        try {
          while (hasMore) {
            const url = new URL(BV_BASE + "/reviews.json");
            url.searchParams.set("apiversion", "5.4");
            url.searchParams.set("passkey", passkey);
            url.searchParams.set("Locale", locale);
            url.searchParams.set("Filter", "ProductId:" + bvProductId);
            url.searchParams.set("Limit", String(PAGE_SIZE));
            url.searchParams.set("Offset", String(offset));
            url.searchParams.set("Sort", "SubmissionTime:asc"); // 오래된 것부터 수집
            url.searchParams.set("Include", "Products");

            const res = await fetch(url.toString());
            if (!res.ok) {
              if (res.status === 429) { await new Promise(r => setTimeout(r, 3000)); continue; }
              break;
            }

            const data = await res.json();
            const reviews = data.Results ?? [];
            totalBV = data.TotalResults ?? totalBV;
            if (reviews.length === 0) break;

            const rows: any[] = [];
            for (const rv of reviews) {
              const reviewText = (rv.ReviewText as string) ?? "";
              if (reviewText.trim().length < 20) continue;

              const externalId = "bv_" + region + "_" + rv.Id;
              const rating = Number(rv.Rating) || null;
              let sentiment = "neutral";
              let sentimentScore = 0.5;
              if (rating !== null) {
                if (rating >= 4) { sentiment = "positive"; sentimentScore = 0.7 + (rating - 4) * 0.15; }
                else if (rating <= 2) { sentiment = "negative"; sentimentScore = 0.1 + (rating - 1) * 0.15; }
              }

              const safeContent = sanitizePII(reviewText).slice(0, 2000);
              const modelNum = rv.OriginalProductName && !rv.OriginalProductName.startsWith("MD")
                ? rv.OriginalProductName : bvProductId;
              const displayName = rv.Products?.[rv.ProductId]?.Name || prog.product_name || "LG Product";
              const category = rv.Products?.[rv.ProductId]?.CategoryId || prog.category || "General";

              if (!productCache[modelNum]) {
                const { data: ex } = await supabase
                  .from("products").select("id").eq("model_number", modelNum).maybeSingle();
                if (ex) { productCache[modelNum] = ex.id; }
                else {
                  const { data: np } = await supabase
                    .from("products").insert({ model_number: modelNum, display_name: displayName, category })
                    .select("id").single();
                  if (np) productCache[modelNum] = np.id;
                }
              }
              const dbProductId = productCache[modelNum];
              if (!dbProductId) continue;

              let reviewType = "organic";
              if (rv.IsSyndicated === true || rv.SyndicationSource) reviewType = "syndication";

              rows.push({
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
            }

            if (rows.length > 0) {
              const { data: inserted } = await supabase
                .from("reviews")
                .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false })
                .select("id");
              prodInserted += inserted?.length ?? 0;
            }

            offset += reviews.length;
            await supabase.from("bv_collection_progress").update({
              last_offset: offset,
              total_collected: (prog.total_collected ?? 0) + prodInserted,
              total_available: totalBV,
              is_complete: offset >= totalBV,
              last_run_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("locale", locale).eq("product_id", bvProductId);

            hasMore = reviews.length === PAGE_SIZE && offset < totalBV;
            await new Promise(r => setTimeout(r, COLLECT_DELAY));
          }
        } catch (e) {
          console.error(`[BV-AUTO] Collect ${locale}/${bvProductId} error:`, e);
        }

        totalInserted += prodInserted;
        productsDone++;
      }

      results[`collect_${locale}`] = { productsDone, totalInserted, totalSkipped };
      console.log(`[BV-AUTO] Collect ${locale}: ${totalInserted} inserted from ${productsDone} products`);
    }
  }

  // ── PHASE 3: INCREMENTAL SYNC (last 25h — 신규 리뷰) ──
  if (mode === "sync" || mode === "full") {
    const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString().split("T")[0];
    const productCache: Record<string, string> = {};

    for (const { locale, region, keyName } of sortedLocales) {
      const passkey = Deno.env.get(keyName)!;
      let totalInserted = 0;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const url = new URL(BV_BASE + "/reviews.json");
        url.searchParams.set("apiversion", "5.4");
        url.searchParams.set("passkey", passkey);
        url.searchParams.set("Locale", locale);
        url.searchParams.set("Limit", String(PAGE_SIZE));
        url.searchParams.set("Offset", String(offset));
        url.searchParams.set("Sort", "SubmissionTime:desc");
        url.searchParams.set("Include", "Products");
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
          if (reviewText.trim().length < 20) continue;

          const externalId = "bv_" + region + "_" + rv.Id;
          const { data: existing } = await supabase
            .from("reviews").select("id").eq("external_id", externalId).maybeSingle();
          if (existing) continue;

          const rating = Number(rv.Rating) || null;
          let sentiment = "neutral";
          let sentimentScore = 0.5;
          if (rating !== null) {
            if (rating >= 4) { sentiment = "positive"; sentimentScore = 0.7 + (rating - 4) * 0.15; }
            else if (rating <= 2) { sentiment = "negative"; sentimentScore = 0.1 + (rating - 1) * 0.15; }
          }

          const safeContent = sanitizePII(reviewText).slice(0, 2000);
          const modelNum = rv.OriginalProductName && !rv.OriginalProductName.startsWith("MD")
            ? rv.OriginalProductName : rv.ProductId || "LG-GENERIC";
          const displayName = rv.Products?.[rv.ProductId]?.Name || "LG Product";
          const category = rv.Products?.[rv.ProductId]?.CategoryId || "General";

          if (!productCache[modelNum]) {
            const { data: ex } = await supabase
              .from("products").select("id").eq("model_number", modelNum).maybeSingle();
            if (ex) { productCache[modelNum] = ex.id; }
            else {
              const { data: np } = await supabase
                .from("products").insert({ model_number: modelNum, display_name: displayName, category })
                .select("id").single();
              if (np) productCache[modelNum] = np.id;
            }
          }
          const dbProductId = productCache[modelNum];
          if (!dbProductId) continue;

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

      results[`sync_${locale}`] = { totalInserted };
      console.log(`[BV-AUTO] Sync ${locale}: ${totalInserted} new reviews`);
    }
  }

  return new Response(
    JSON.stringify({ success: true, mode, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
