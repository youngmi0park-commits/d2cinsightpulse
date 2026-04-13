import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SOURCE_TO_LGE: Record<string, string> = {
  lge_com_us: "LGEUS", lge_com_uk: "LGEUK", lge_com_de: "LGEDE",
  lge_com_au: "LGEAP", lge_com_in: "LGEIL", lge_com_tw: "LGETT",
  lge_com_jp: "LGEJP", lge_com_th: "LGETH",
  lge_com_sg: "LGESL", lge_com_my: "LGEML", lge_com_id: "LGEIN",
  lge_com_ph: "LGEPH", lge_com_vn: "LGEVN", lge_com_hk: "LGEHK",
  lge_com_ca: "LGECI", lge_com_br: "LGESP", lge_com_mx: "LGEMS",
  lge_com_fr: "LGEFS", lge_com_nl: "LGEBN",
};

const DOT_COLOR: Record<string, string> = {
  lgcom: "#C8102E", reddit: "#FF4500", youtube: "#FF0000",
  trustpilot: "#00B67A", amazon: "#FF9900", bestbuy: "#007DC1",
  walmart: "#0071CE", target: "#CC0000", cnet: "#E53935",
  rtings: "#333", default: "#999",
};

const LGE_CODES = Object.values(SOURCE_TO_LGE);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: CORS });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const { weekStart, weekEnd, forceRegenerate = false } = body;

    if (!weekStart || !weekEnd)
      return json({ error: "weekStart and weekEnd required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { db: { schema: "public" }, global: { headers: { "x-statement-timeout": "60000" } } }
    );

    // ── 1. Fetch aggregated review data via DB function ──
    const { data: agg, error: aggErr } = await supabase.rpc("get_newsletter_aggregates", {
      p_start: weekStart + "T00:00:00+00",
      p_end: weekEnd + "T23:59:59+00",
    });
    if (aggErr) throw new Error(aggErr.message || JSON.stringify(aggErr));
    if (!agg || agg.length === 0)
      return json({ error: "No reviews found for this period" }, 404);

    // ── 2. Fetch product info for category mapping ──
    const productIds = [...new Set(agg.map((r: any) => r.product_id as string))];
    const productMap: Record<string, { category: string; display_name: string }> = {};
    for (let i = 0; i < productIds.length; i += 500) {
      const chunk = productIds.slice(i, i + 500);
      const { data: prods } = await supabase
        .from("products")
        .select("id, category, display_name")
        .in("id", chunk);
      for (const p of prods ?? []) {
        productMap[p.id] = { category: p.category, display_name: p.display_name };
      }
    }

    // ── 3. Country & source aggregation from pre-aggregated data ──
    type CountryStats = {
      total: number; positive: number; negative: number; neutral: number;
      categories: Record<string, number>;
      products: Record<string, number>;
    };

    const byCountry: Record<string, CountryStats> = {};
    const bySource: Record<string, number> = {};
    let totalReviews = 0;
    let overallPositive = 0;

    for (const row of agg) {
      const source = (row.source as string) ?? "";
      const count = Number(row.cnt);
      totalReviews += count;
      if (row.sentiment === "positive") overallPositive += count;

      // Source aggregation
      let group = source;
      if (source.startsWith("lge_com")) group = "lgcom";
      else if (source.startsWith("reddit")) group = "reddit";
      else if (source.startsWith("youtube")) group = "youtube";
      bySource[group] = (bySource[group] ?? 0) + count;

      // Country aggregation
      const code = SOURCE_TO_LGE[source];
      if (!code) continue;

      if (!byCountry[code]) {
        byCountry[code] = { total: 0, positive: 0, negative: 0, neutral: 0, categories: {}, products: {} };
      }
      const c = byCountry[code];
      c.total += count;
      if (row.sentiment === "positive") c.positive += count;
      else if (row.sentiment === "negative") c.negative += count;
      else c.neutral += count;

      const prod = productMap[row.product_id as string];
      const cat = prod?.category ?? "General";
      c.categories[cat] = (c.categories[cat] ?? 0) + count;
      if (prod?.display_name) {
        c.products[prod.display_name] = (c.products[prod.display_name] ?? 0) + count;
      }
    }

    // ── 4. Source aggregation ──
    const bySource: Record<string, number> = {};
    for (const rv of allReviews) {
      const s = (rv.source as string) ?? "unknown";
      // Normalize source groups
      let group = s;
      if (s.startsWith("lge_com")) group = "lgcom";
      else if (s.startsWith("reddit")) group = "reddit";
      else if (s.startsWith("youtube")) group = "youtube";
      bySource[group] = (bySource[group] ?? 0) + 1;
    }

    // ── 5. Overall sentiment ──
    const overallPositive = allReviews.filter(r => r.sentiment === "positive").length;
    const avgSentiment = Math.round((overallPositive / totalReviews) * 100);

    // ── 6. Auto-classify country signals ──
    const autoClassify = (stats: CountryStats): string[] => {
      const score = stats.total > 0
        ? Math.round((stats.positive / stats.total) * 100) : 0;
      const negRate = stats.total > 0 ? (stats.negative / stats.total) : 0;
      const tags: string[] = [];

      if (score >= 80 && stats.total >= 30) tags.push("PMAX_UP", "AFFILIATE_UP");
      else if (score >= 65 && stats.total >= 15) tags.push("PMAX_HOLD", "AFFILIATE_BRIEF");
      else if (score < 65) tags.push("PMAX_PAUSE");

      if (negRate >= 0.4) tags.push("FAQ_URGENT", "PDP_FAQ", "DEFEND");
      if (negRate >= 0.5) tags.push("CRITEO_OFF");
      else if (score >= 75) tags.push("CRITEO_ON");

      return [...new Set(tags)];
    };

    // ── 7. Matrix auto-build ──
    const CATEGORIES = [
      { name: "TV", nameEn: "TV" },
      { name: "Refrigerator", nameEn: "Refrigerator" },
      { name: "Dishwasher", nameEn: "Dishwasher" },
      { name: "Air Conditioner", nameEn: "Air Conditioner" },
      { name: "Washing Machine", nameEn: "Washing Machine" },
      { name: "Monitor", nameEn: "Monitor" },
      { name: "Laptop", nameEn: "Laptop" },
      { name: "Audio", nameEn: "Audio" },
    ];

    const SE_ASIA = ["LGESL", "LGEML", "LGEIN", "LGETH", "LGEPH", "LGEVN"];

    const buildMatrixCells = (catName: string): Record<string, string> => {
      const cells: Record<string, string> = {};
      for (const [code, stats] of Object.entries(byCountry)) {
        const catCount = stats.categories[catName] ?? 0;
        if (catCount === 0) { cells[code] = "NONE"; continue; }

        const catPositive = catCount * (stats.positive / Math.max(stats.total, 1));
        const posRate = catCount > 0 ? catPositive / catCount : 0;
        const negRate = 1 - posRate;

        if (catName === "Air Conditioner" && SE_ASIA.includes(code)) {
          cells[code] = "SEASON";
        } else if (negRate >= 0.4) {
          cells[code] = "DEFEND";
        } else if (posRate >= 0.8 && catCount >= 20) {
          cells[code] = "ON";
        } else if (catCount >= 10) {
          cells[code] = "WATCH";
        } else {
          cells[code] = "READY";
        }
      }
      return cells;
    };

    // ── 8. Build context for AI ──
    const countryContext = Object.entries(byCountry)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 12)
      .map(([code, d]) => {
        const score = Math.round((d.positive / Math.max(d.total, 1)) * 100);
        const topCat = Object.entries(d.categories)
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "General";
        const topProds = Object.entries(d.products)
          .sort((a, b) => b[1] - a[1]).slice(0, 3)
          .map(([n, c]) => n + "(" + c + ")").join(", ");
        return code + ": score=" + score + ", total=" + d.total +
          ", pos=" + d.positive + ", neg=" + d.negative +
          ", topCat=" + topCat + ", topProducts=[" + topProds + "]";
      }).join("\n");

    const sourceContext = Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => s + ":" + n).join(", ");

    // ── 9. AI call via Lovable AI Gateway ──
    const aiApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    const systemPrompt = "You are a senior LG Electronics global performance marketing strategist. " +
      "Analyze weekly VOC data and generate actionable marketing decisions.\n\n" +
      "RULES:\n" +
      "1. Use LGE subsidiary codes (LGEUS, LGEDE, etc.) — never ISO 2-letter codes\n" +
      "2. SignalTags: PMAX_UP|PMAX_HOLD|PMAX_PAUSE|CRITEO_ON|CRITEO_OFF|AFFILIATE_UP|AFFILIATE_BRIEF|FAQ_URGENT|PDP_FAQ|GEO_READY|SEO_READY|META_ON|YOUTUBE_ON|SEASON_ON|MONITOR|DEFEND\n" +
      "3. FAQ CIS score = conversion impact 0-100. P0>=80, P1=65-79, P2=50-64\n" +
      "4. FAQ types: pdp|geo|seo|crm. Channel types: pmax|criteo|affiliate|meta|youtube\n" +
      "5. ALL text fields MUST have Korean (ko) AND English (en) versions\n" +
      "6. PMAX headline <=30 chars; Criteo <=38 chars; Meta primary <=125 chars\n" +
      "7. Generate MINIMUM: 5 channel actions, 5 FAQ items, 2 caution items\n\n" +
      "Output ONLY valid JSON with keys: channelActions, faqItems, cautionItems.\n" +
      "channelActions: [{channelType, targetCodes, actionTitleKo, actionTitleEn, basisKo, basisEn, copyHeadlineKo, copyHeadlineEn, tags, sortOrder}]\n" +
      "faqItems: [{faqType, questionKo, questionEn, answerKo, answerEn, cisScore, priority, sortOrder}]\n" +
      "cautionItems: [{severity, targetCodes, titleKo, titleEn, bodyKo, bodyEn, sortOrder}]";

    const userPrompt = "Week: " + weekStart + " ~ " + weekEnd + "\n" +
      "Total reviews: " + totalReviews + ", Avg sentiment: " + avgSentiment + "pts\n" +
      "Active countries: " + Object.keys(byCountry).length + "\n\n" +
      "Country breakdown:\n" + countryContext + "\n\n" +
      "Source counts: " + sourceContext + "\n\n" +
      "Generate 5+ channel actions (mix pmax/criteo/affiliate/meta/youtube), " +
      "5+ FAQ items (mix pdp/geo/seo), 2+ caution items. " +
      "Prioritize countries with most data. Use real numbers.";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + aiApiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    const aiData = await aiRes.json();
    const rawText = aiData.choices?.[0]?.message?.content ?? "{}";
    const intel = JSON.parse(rawText.replace(/```json|```/g, "").trim());

    // ── 10. Save to DB ──
    const { data: issue, error: issueErr } = await supabase
      .from("newsletter_issues")
      .upsert({
        week_start: weekStart,
        week_end: weekEnd,
        issue_date: weekStart,
        title: "D2C Insight Pulse — " + weekStart + " ~ " + weekEnd,
        total_reviews: totalReviews,
        countries_count: Object.keys(byCountry).length,
        channels_count: Object.keys(bySource).length,
        avg_sentiment: avgSentiment,
        status: "draft",
        generated_at: new Date().toISOString(),
      }, { onConflict: "week_start" })
      .select().single();

    if (issueErr) throw issueErr;
    const issueId = issue.id;

    // Always clean existing child data to prevent duplicates
    await Promise.all([
      supabase.from("newsletter_country_signals").delete().eq("issue_id", issueId),
      supabase.from("newsletter_matrix_rows").delete().eq("issue_id", issueId),
      supabase.from("newsletter_channel_actions").delete().eq("issue_id", issueId),
      supabase.from("newsletter_faq_items").delete().eq("issue_id", issueId),
      supabase.from("newsletter_caution_items").delete().eq("issue_id", issueId),
      supabase.from("newsletter_collection_stats").delete().eq("issue_id", issueId),
    ]);

    // Country signals
    const signalRows = Object.entries(byCountry)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([code, d], i) => {
        const score = Math.round((d.positive / Math.max(d.total, 1)) * 100);
        const topCat = Object.entries(d.categories)
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "General";
        return {
          issue_id: issueId,
          subsidiary_code: code,
          sentiment_score: score,
          total_reviews: d.total,
          positive_count: d.positive,
          negative_count: d.negative,
          top_category: topCat,
          top_insight_ko: "이번 주 " + d.total + "건 수집, 감성 " + score + "점",
          top_insight_en: d.total + " reviews this week, sentiment " + score + "pts",
          signal_tags: autoClassify(d),
          sort_order: i,
        };
      });
    if (signalRows.length > 0) {
      const { error: sigErr } = await supabase.from("newsletter_country_signals").insert(signalRows);
      if (sigErr) console.error("Signal insert error:", sigErr.message);
    }

    // Matrix rows
    const matrixRows = CATEGORIES.map((cat, i) => ({
      issue_id: issueId,
      category_name: cat.name,
      category_name_en: cat.nameEn,
      cells: buildMatrixCells(cat.name),
      sort_order: i,
    }));
    await supabase.from("newsletter_matrix_rows").insert(matrixRows);

    // Channel actions (AI-generated)
    if (intel.channelActions?.length) {
      await supabase.from("newsletter_channel_actions").insert(
        intel.channelActions.map((a: Record<string, unknown>, i: number) => ({
          issue_id: issueId,
          channel_type: a.channelType,
          target_codes: a.targetCodes,
          action_title_ko: a.actionTitleKo,
          action_title_en: a.actionTitleEn,
          basis_ko: a.basisKo,
          basis_en: a.basisEn,
          copy_headline_ko: a.copyHeadlineKo,
          copy_headline_en: a.copyHeadlineEn,
          tags: a.tags,
          sort_order: (a.sortOrder as number) ?? i,
        }))
      );
    }

    // FAQ items (AI-generated)
    if (intel.faqItems?.length) {
      await supabase.from("newsletter_faq_items").insert(
        intel.faqItems.map((f: Record<string, unknown>, i: number) => ({
          issue_id: issueId,
          faq_type: f.faqType,
          question_ko: f.questionKo,
          question_en: f.questionEn,
          answer_ko: f.answerKo,
          answer_en: f.answerEn,
          cis_score: f.cisScore,
          priority: f.priority,
          sort_order: (f.sortOrder as number) ?? i,
        }))
      );
    }

    // Caution items (AI-generated)
    if (intel.cautionItems?.length) {
      await supabase.from("newsletter_caution_items").insert(
        intel.cautionItems.map((c: Record<string, unknown>, i: number) => ({
          issue_id: issueId,
          severity: c.severity,
          target_codes: c.targetCodes,
          title_ko: c.titleKo,
          title_en: c.titleEn,
          body_ko: c.bodyKo,
          body_en: c.bodyEn,
          sort_order: (c.sortOrder as number) ?? i,
        }))
      );
    }

    // Collection stats
    const statsRows = Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count], i) => ({
        issue_id: issueId,
        source,
        display_name: source.charAt(0).toUpperCase() + source.slice(1),
        review_count: count,
        dot_color: DOT_COLOR[source.toLowerCase()] ?? DOT_COLOR.default,
        show_as_pill: count >= 100,
        sort_order: i,
      }));
    await supabase.from("newsletter_collection_stats").insert(statsRows);

    return json({
      success: true,
      issueId,
      totalReviews,
      countries: Object.keys(byCountry).length,
      avgSentiment,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("generate-newsletter error:", msg);
    return json({ success: false, error: msg }, 500);
  }
});
