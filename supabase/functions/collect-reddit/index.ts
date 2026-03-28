import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ══════════════════════════════════════════════════════════════
//  SUBREDDIT DEFINITIONS — categorised by LG product line
// ══════════════════════════════════════════════════════════════

const SUBREDDITS: Record<string, { subs: string[]; keywords: string[] }> = {
  TV: {
    subs: [
      "OLED", "4kTV", "hometheater", "bravia", "TVRepair",
      "LGtv", "LGOLED", "HTBuyingAdvice", "Roku",
    ],
    keywords: [
      "LG OLED", "LG C4", "LG C5", "LG G4", "LG G5", "LG G6",
      "C6H", "W6", "OLED evo", "LG QNED", "LG NanoCell", "LG TV",
      "burn-in", "webOS", "magic remote", "Dolby Vision",
      "OLED65", "OLED55", "OLED77", "OLED83",
    ],
  },
  Monitor: {
    subs: [
      "Monitors", "ultrawidemasterrace", "buildapc", "pcmasterrace",
      "GamingMonitors", "LGUltraGear",
    ],
    keywords: [
      "LG UltraGear", "LG UltraFine", "LG UltraWide",
      "27GR83Q", "27GR95QE", "32GS95UE", "27GP850",
      "LG monitor", "LG 4K monitor", "LG gaming monitor",
    ],
  },
  Laptop: {
    subs: ["LGGram", "laptops", "SuggestALaptop", "thinkpad"],
    keywords: [
      "LG Gram", "Gram Pro", "Gram 16", "Gram 17",
      "17Z90TP", "LG laptop", "Gram 2-in-1",
    ],
  },
  Audio: {
    subs: ["Soundbars", "hometheater", "audiophile", "Bluetooth_Speakers"],
    keywords: [
      "LG Soundbar", "S95TR", "S90TR", "S80QY", "XBOOM",
      "LG speaker", "WOW Orchestra", "Dolby Atmos soundbar",
    ],
  },
  HomeAppliance: {
    subs: [
      "Appliances", "homeautomation", "BuyItForLife",
      "CleaningTips", "Laundry",
    ],
    keywords: [
      "LG WashTower", "LG InstaView", "LG CordZero",
      "LG washer", "LG dryer", "LG refrigerator", "LG dishwasher",
      "ThinQ", "LG PuriCare", "LG vacuum",
    ],
  },
  AirConditioner: {
    subs: ["HVAC", "AirConditioning", "homeimprovement"],
    keywords: [
      "LG AC", "LG air conditioner", "dual inverter",
      "LG window AC", "LG portable AC", "LG split AC",
    ],
  },
  StanbyME: {
    subs: ["LGtv", "hometheater", "Monitors"],
    keywords: ["StanbyME", "StandbyMe", "Stand by Me", "27LX6"],
  },
};

// ══════════════════════════════════════════════════════════════
//  BUCKET CLASSIFICATION (REVIEW / VOC / QUESTION)
// ══════════════════════════════════════════════════════════════

type Bucket = "REVIEW" | "VOC" | "QUESTION";

const QUESTION_PATTERNS = [
  /\bshould\s+i\b/i, /\bworth\s+(it|the|buying)\b/i,
  /\bvs\.?\b/i, /\bwhich\s+(one|is|should)\b/i,
  /\brecommend(ation)?s?\b/i, /\badvice\b/i,
  /\bhow\s+(do|does|is|can|to|much|long)\b/i,
  /\bwhat\s+(is|are|do|should)\b/i,
  /\bdoes\s+(it|the|this|anyone)\b/i,
  /\bcan\s+(i|you|someone)\b/i,
  /\bis\s+it\s+(good|worth|better)\b/i,
  /\?$/m,
];

const VOC_PATTERNS = [
  /\b(disappointed|frustrated|terrible|awful|worst|defective)\b/i,
  /\b(refund|return(ed|ing)?|warranty|broke|broken|dead pixel)\b/i,
  /\b(not working|stopped working|issue|problem|bug|error|crash)\b/i,
  /\b(regret|waste of money|do not buy|avoid|scam)\b/i,
  /\b(customer service|support ticket|repair|replacement)\b/i,
];

const REVIEW_PATTERNS = [
  /\b(just (bought|got|received|installed|set up))\b/i,
  /\b(month|week|year)s?\s+(later|in|of|with|owning)\b/i,
  /\b(love|loving|impressed|stunning|amazing|great|excellent)\b/i,
  /\b(my (new|lg|oled))\b/i,
  /\b(owner|owned|using it|daily driver)\b/i,
  /\b(review|impression|first look|hands on|unbox)\b/i,
  /\bupgrade(d)?\s+(from|to)\b/i,
];

function classifyBucket(title: string, content: string): { bucket: Bucket; confidence: number } {
  const text = `${title} ${content}`.toLowerCase();

  let qScore = 0, vScore = 0, rScore = 0;
  for (const p of QUESTION_PATTERNS) if (p.test(text)) qScore++;
  for (const p of VOC_PATTERNS) if (p.test(text)) vScore++;
  for (const p of REVIEW_PATTERNS) if (p.test(text)) rScore++;

  if (vScore >= 2) return { bucket: "VOC", confidence: Math.min(vScore / 4, 1) };
  if (qScore >= 2 && qScore > rScore) return { bucket: "QUESTION", confidence: Math.min(qScore / 5, 1) };
  if (rScore >= 1) return { bucket: "REVIEW", confidence: Math.min(rScore / 4, 1) };
  if (qScore >= 1) return { bucket: "QUESTION", confidence: 0.4 };
  if (vScore >= 1) return { bucket: "VOC", confidence: 0.4 };
  return { bucket: "REVIEW", confidence: 0.3 };
}

// ══════════════════════════════════════════════════════════════
//  SENTIMENT SCORING (lightweight rule-based)
// ══════════════════════════════════════════════════════════════

const POS_WORDS = ["love", "great", "excellent", "amazing", "stunning", "impressed", "perfect", "recommend", "fantastic", "premium", "worth", "beautiful", "reliable", "best"];
const NEG_WORDS = ["hate", "terrible", "awful", "worst", "disappointed", "frustrated", "broken", "defective", "regret", "waste", "poor", "bad", "overpriced", "garbage"];

function scoreSentiment(text: string): { sentiment: string; score: number } {
  const lower = text.toLowerCase();
  let pos = 0, neg = 0;
  for (const w of POS_WORDS) if (lower.includes(w)) pos++;
  for (const w of NEG_WORDS) if (lower.includes(w)) neg++;
  const total = pos + neg || 1;
  const score = (pos - neg) / total;
  if (score > 0.2) return { sentiment: "positive", score: 0.5 + score * 0.5 };
  if (score < -0.2) return { sentiment: "negative", score: 0.5 + score * 0.5 };
  return { sentiment: "neutral", score: 0.5 };
}

// ══════════════════════════════════════════════════════════════
//  REDDIT API HELPERS
// ══════════════════════════════════════════════════════════════

const REDDIT_USER_AGENT = "D2CInsightPulse/1.0 (by /u/lgd2c_collector)";

async function fetchRedditJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": REDDIT_USER_AGENT },
  });
  if (!res.ok) {
    console.error(`Reddit API ${res.status}: ${url}`);
    return null;
  }
  // Rate limit: ~1 req/sec for unauthenticated
  await new Promise((r) => setTimeout(r, 1100));
  return res.json();
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  url: string;
}

interface RedditComment {
  id: string;
  body: string;
  author: string;
  score: number;
  created_utc: number;
  permalink: string;
}

async function searchSubreddit(
  subreddit: string,
  keyword: string,
  days: number,
  limit = 25,
): Promise<RedditPost[]> {
  const after = Math.floor(Date.now() / 1000) - days * 86400;
  const q = encodeURIComponent(keyword);
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${q}&restrict_sr=1&sort=relevance&t=${days <= 7 ? "week" : days <= 30 ? "month" : "year"}&limit=${limit}`;
  const data = await fetchRedditJson(url);
  if (!data?.data?.children) return [];
  return data.data.children
    .map((c: any) => c.data as RedditPost)
    .filter((p: RedditPost) => p.created_utc >= after);
}

async function fetchPostComments(
  permalink: string,
  limit = 50,
): Promise<RedditComment[]> {
  const url = `https://www.reddit.com${permalink}.json?limit=${limit}&sort=top&depth=3`;
  const data = await fetchRedditJson(url);
  if (!Array.isArray(data) || data.length < 2) return [];
  const comments: RedditComment[] = [];
  function extractComments(listing: any) {
    if (!listing?.data?.children) return;
    for (const child of listing.data.children) {
      if (child.kind === "t1" && child.data?.body) {
        comments.push({
          id: child.data.id,
          body: child.data.body,
          author: child.data.author,
          score: child.data.score || 0,
          created_utc: child.data.created_utc,
          permalink: child.data.permalink || "",
        });
        if (child.data.replies) extractComments(child.data.replies);
      }
    }
  }
  extractComments(data[1]);
  return comments;
}

// ══════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Parse options
  let days = 30;
  let deepComments = true;
  let mode: "all" | "review" | "voc" | "question" = "all";
  let categoryFilter: string | null = null;
  let globalSearch = true;

  try {
    const body = await req.json();
    if (body.days) days = Math.min(Number(body.days), 90);
    if (body.deepComments !== undefined) deepComments = body.deepComments;
    if (body.mode) mode = body.mode;
    if (body.category) categoryFilter = body.category;
    if (body.globalSearch !== undefined) globalSearch = body.globalSearch;
  } catch {
    // defaults
  }

  // Log start
  const { data: logEntry } = await supabase
    .from("collection_logs")
    .insert({ source: "reddit_collector", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  let totalCollected = 0;
  let totalSkipped = 0;
  const errors: string[] = [];
  const seenPostIds = new Set<string>();

  try {
    // Determine which categories to process
    const categories = categoryFilter
      ? { [categoryFilter]: SUBREDDITS[categoryFilter] }
      : SUBREDDITS;

    for (const [category, config] of Object.entries(categories)) {
      if (!config) continue;

      for (const subreddit of config.subs) {
        for (const keyword of config.keywords.slice(0, 5)) {
          try {
            const posts = await searchSubreddit(subreddit, keyword, days, 15);
            console.log(`[r/${subreddit}] "${keyword}" → ${posts.length} posts`);

            for (const post of posts) {
              if (seenPostIds.has(post.id)) continue;
              seenPostIds.add(post.id);

              const fullText = `${post.title} ${post.selftext}`.trim();
              if (fullText.length < 20) continue;

              // Classify bucket
              const { bucket, confidence } = classifyBucket(post.title, post.selftext);

              // Mode filter
              if (mode !== "all") {
                if (mode === "review" && bucket !== "REVIEW") continue;
                if (mode === "voc" && bucket !== "VOC") continue;
                if (mode === "question" && bucket !== "QUESTION") continue;
              }

              // Sentiment
              const { sentiment, score } = scoreSentiment(fullText);

              // Find or create product
              const productId = await findOrCreateProduct(
                supabase, keyword, category,
              );

              // Check duplicate
              const { data: existing } = await supabase
                .from("reviews")
                .select("id")
                .eq("external_id", `reddit_${post.id}`)
                .maybeSingle();

              if (existing) {
                totalSkipped++;
                continue;
              }

              // Save post as review
              const { error: insertErr } = await supabase.from("reviews").insert({
                product_id: productId,
                source: `reddit_${subreddit}`,
                external_id: `reddit_${post.id}`,
                author: post.author !== "[deleted]" ? post.author : null,
                title: post.title.slice(0, 500),
                content: (post.selftext || post.title).slice(0, 5000),
                sentiment,
                sentiment_score: score,
                rating: null,
                published_at: new Date(post.created_utc * 1000).toISOString(),
                source_url: `https://reddit.com${post.permalink}`,
                review_type: bucket.toLowerCase(),
                content_type: "community",
                platform_type: "community",
                user_type: "actual_user",
              });

              if (insertErr) {
                errors.push(`Insert post ${post.id}: ${insertErr.message}`);
              } else {
                totalCollected++;
              }

              // Deep comments
              if (deepComments && post.num_comments > 0) {
                try {
                  const comments = await fetchPostComments(post.permalink, 30);
                  const lgComments = comments.filter((c) => {
                    const t = c.body.toLowerCase();
                    return config.keywords.some((kw) => t.includes(kw.toLowerCase())) ||
                      t.includes("lg ") || t.includes("oled") || t.includes("ultragear") ||
                      t.includes("gram") || t.includes("washtower") || t.includes("thinq");
                  });

                  for (const comment of lgComments.slice(0, 10)) {
                    if (comment.body.length < 30) continue;

                    const { data: cExisting } = await supabase
                      .from("reviews")
                      .select("id")
                      .eq("external_id", `reddit_c_${comment.id}`)
                      .maybeSingle();

                    if (cExisting) continue;

                    const cBucket = classifyBucket("", comment.body);
                    if (mode !== "all") {
                      if (mode === "review" && cBucket.bucket !== "REVIEW") continue;
                      if (mode === "voc" && cBucket.bucket !== "VOC") continue;
                      if (mode === "question" && cBucket.bucket !== "QUESTION") continue;
                    }

                    const cSentiment = scoreSentiment(comment.body);

                    await supabase.from("reviews").insert({
                      product_id: productId,
                      source: `reddit_${subreddit}`,
                      external_id: `reddit_c_${comment.id}`,
                      author: comment.author !== "[deleted]" ? comment.author : null,
                      title: `Re: ${post.title.slice(0, 200)}`,
                      content: comment.body.slice(0, 5000),
                      sentiment: cSentiment.sentiment,
                      sentiment_score: cSentiment.score,
                      rating: null,
                      published_at: new Date(comment.created_utc * 1000).toISOString(),
                      source_url: `https://reddit.com${comment.permalink || post.permalink}`,
                      review_type: cBucket.bucket.toLowerCase(),
                      content_type: "community",
                      platform_type: "community",
                      user_type: "actual_user",
                    });
                    totalCollected++;
                  }
                } catch (commentErr) {
                  console.error(`Comments error for ${post.id}: ${commentErr}`);
                }
              }
            }
          } catch (searchErr) {
            const msg = `r/${subreddit} "${keyword}": ${searchErr}`;
            console.error(msg);
            errors.push(msg);
          }
        }
      }
    }

    // Global search across all of Reddit (not restricted to subreddits)
    if (globalSearch) {
      const globalKeywords = [
        "LG OLED review", "LG TV 2025", "LG C5 vs", "LG G5 review",
        "LG UltraGear review", "LG Gram review", "LG WashTower review",
        "LG soundbar review", "LG air conditioner review",
        "LG OLED burn-in", "LG TV worth it",
      ];

      for (const gk of globalKeywords) {
        try {
          const q = encodeURIComponent(gk);
          const url = `https://www.reddit.com/search.json?q=${q}&sort=relevance&t=${days <= 7 ? "week" : "month"}&limit=10`;
          const data = await fetchRedditJson(url);
          if (!data?.data?.children) continue;

          for (const child of data.data.children) {
            const post = child.data as RedditPost;
            if (seenPostIds.has(post.id)) continue;
            seenPostIds.add(post.id);

            const fullText = `${post.title} ${post.selftext}`.trim();
            if (fullText.length < 20) continue;

            const { bucket } = classifyBucket(post.title, post.selftext);
            if (mode !== "all") {
              if (mode === "review" && bucket !== "REVIEW") continue;
              if (mode === "voc" && bucket !== "VOC") continue;
              if (mode === "question" && bucket !== "QUESTION") continue;
            }

            const { sentiment, score } = scoreSentiment(fullText);

            // Detect category from text
            const detectedCategory = detectCategory(fullText);
            const productId = await findOrCreateProduct(supabase, gk.split(" ")[1] || "LG", detectedCategory);

            const { data: existing } = await supabase
              .from("reviews")
              .select("id")
              .eq("external_id", `reddit_${post.id}`)
              .maybeSingle();

            if (existing) continue;

            await supabase.from("reviews").insert({
              product_id: productId,
              source: `reddit_${post.subreddit}`,
              external_id: `reddit_${post.id}`,
              author: post.author !== "[deleted]" ? post.author : null,
              title: post.title.slice(0, 500),
              content: (post.selftext || post.title).slice(0, 5000),
              sentiment, sentiment_score: score,
              rating: null,
              published_at: new Date(post.created_utc * 1000).toISOString(),
              source_url: `https://reddit.com${post.permalink}`,
              review_type: bucket.toLowerCase(),
              content_type: "community",
              platform_type: "community",
              user_type: "actual_user",
            });
            totalCollected++;
          }
        } catch (ge) {
          errors.push(`Global "${gk}": ${ge}`);
        }
      }
    }
  } catch (fatalErr) {
    errors.push(`Fatal: ${fatalErr}`);
  }

  // Update log
  if (logId) {
    await supabase
      .from("collection_logs")
      .update({
        status: errors.length > 0 ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        items_collected: totalCollected,
        error_message: errors.length > 0 ? errors.slice(0, 10).join(" | ") : null,
      })
      .eq("id", logId);
  }

  const result = {
    success: true,
    collected: totalCollected,
    skipped_duplicates: totalSkipped,
    unique_posts_seen: seenPostIds.size,
    errors: errors.length,
    error_samples: errors.slice(0, 5),
    config: { days, deepComments, mode, categoryFilter, globalSearch },
  };

  console.log(`✅ Reddit collection complete:`, JSON.stringify(result));

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

function detectCategory(text: string): string {
  const t = text.toLowerCase();
  if (/\b(oled|qned|nanocell|tv|television|webos)\b/.test(t)) return "TV";
  if (/\b(monitor|ultragear|ultrawide|ultrafinefine|gaming\s*monitor)\b/.test(t)) return "Monitor";
  if (/\b(gram|laptop)\b/.test(t)) return "Laptop";
  if (/\b(soundbar|xboom|speaker|audio|atmos)\b/.test(t)) return "Audio";
  if (/\b(washer|dryer|washtower|laundry)\b/.test(t)) return "Washer";
  if (/\b(refrigerator|fridge|instaview)\b/.test(t)) return "Refrigerator";
  if (/\b(air\s*condition|ac\b|hvac|dual\s*inverter)\b/.test(t)) return "Air Conditioner";
  if (/\b(vacuum|cordzero|robot)\b/.test(t)) return "Robot Vacuum";
  if (/\b(stanby|stand\s*by\s*me)\b/.test(t)) return "TV";
  return "TV"; // default
}

const productCache = new Map<string, string>();

async function findOrCreateProduct(
  supabase: any,
  keyword: string,
  category: string,
): Promise<string> {
  const cacheKey = `${keyword}_${category}`;
  if (productCache.has(cacheKey)) return productCache.get(cacheKey)!;

  // Try to match existing product
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .or(`model_number.ilike.%${keyword.replace(/['"]/g, "")}%,display_name.ilike.%${keyword.replace(/['"]/g, "")}%`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    productCache.set(cacheKey, existing.id);
    return existing.id;
  }

  // Create generic product for this category
  const modelNum = `Reddit_${category}_General`;
  const { data: genExisting } = await supabase
    .from("products")
    .select("id")
    .eq("model_number", modelNum)
    .maybeSingle();

  if (genExisting) {
    productCache.set(cacheKey, genExisting.id);
    return genExisting.id;
  }

  const { data: newProduct } = await supabase
    .from("products")
    .insert({
      model_number: modelNum,
      display_name: `LG ${category} (Reddit VOC)`,
      category,
      is_active: true,
    })
    .select("id")
    .single();

  const id = newProduct?.id || "unknown";
  productCache.set(cacheKey, id);
  return id;
}
