import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ══════════════════════════════════════════════════════════════
//  REDDIT-FOCUSED SEARCH QUERIES — per category (대폭 확장)
// ══════════════════════════════════════════════════════════════

const REDDIT_QUERIES: Record<string, string[]> = {
  TV: [
    'site:reddit.com LG OLED (review OR "just bought" OR owner OR impression) 2025 OR 2026',
    'site:reddit.com "LG C5" OR "LG C4" OR "LG G5" OR "LG G6" review OR worth OR recommend',
    'site:reddit.com LG OLED (burn-in OR "picture quality" OR gaming OR "Dolby Vision")',
    'site:reddit.com LG OLED (disappointed OR issue OR problem OR "not working" OR defective)',
    'site:reddit.com "should I buy" LG OLED OR "LG TV" OR C5 OR G5 vs',
    'site:reddit.com LG QNED OR NanoCell review OR recommendation',
    'site:reddit.com LG OLED (calibration OR settings OR "best picture" OR tips)',
    'site:reddit.com "LG C6H" OR "LG W6" OR "OLED evo" 2026 review',
    'site:reddit.com/r/OLED LG (impression OR experience OR setup)',
    'site:reddit.com/r/4kTV LG OLED OR QNED comparison',
    'site:reddit.com/r/hometheater LG OLED OR projector setup',
    'site:reddit.com LG OLED "webOS" (lag OR slow OR ads OR update)',
    'site:reddit.com LG OLED "magic remote" (broken OR battery OR pairing)',
  ],
  Monitor: [
    'site:reddit.com LG UltraGear (review OR "just bought" OR impression OR gaming)',
    'site:reddit.com "27GR83Q" OR "32GS95UE" OR "27GP850" OR "LG monitor" review',
    'site:reddit.com LG monitor (flickering OR issue OR problem OR calibration)',
    'site:reddit.com "LG UltraWide" OR "LG UltraFine" review OR recommend',
    'site:reddit.com/r/Monitors LG OLED OR UltraGear',
    'site:reddit.com/r/buildapc LG monitor recommendation',
    'site:reddit.com/r/buildapcsales LG (UltraGear OR monitor)',
    'site:reddit.com/r/ultrawidemasterrace LG (review OR setup)',
    'site:reddit.com LG monitor "DisplayPort" OR "HDMI 2.1" issue',
  ],
  Laptop: [
    'site:reddit.com "LG Gram" (review OR "just bought" OR lightweight OR battery)',
    'site:reddit.com "LG Gram Pro" OR "Gram 17" OR "Gram 16" 2025 OR 2026 review',
    'site:reddit.com "LG Gram" (issue OR problem OR overheating OR keyboard)',
    'site:reddit.com/r/LGgram (impression OR question OR setup)',
    'site:reddit.com/r/SuggestALaptop "LG Gram" recommend',
    'site:reddit.com "LG Gram" "thermal throttling" OR fan OR noise',
    'site:reddit.com "LG Gram" battery life OR display OR build quality',
  ],
  Audio: [
    'site:reddit.com "LG Soundbar" (review OR "just bought" OR "Dolby Atmos" OR setup)',
    'site:reddit.com "S95TR" OR "S90TR" OR "S80QY" OR "XBOOM" review OR recommend',
    'site:reddit.com LG soundbar (issue OR problem OR "no sound" OR sync OR connectivity)',
    'site:reddit.com/r/Soundbars LG (S95 OR S90 OR S80 OR review)',
    'site:reddit.com/r/hometheater LG soundbar setup OR comparison',
    'site:reddit.com LG XBOOM (party OR speaker OR bluetooth review)',
    'site:reddit.com LG "WOW Orchestra" OR "WOWCAST" experience',
  ],
  HomeAppliance: [
    'site:reddit.com LG WashTower OR "LG washer" OR "LG dryer" review OR recommend',
    'site:reddit.com LG InstaView OR "LG refrigerator" OR "LG fridge" review',
    'site:reddit.com LG CordZero OR "LG vacuum" OR "LG PuriCare" review',
    'site:reddit.com LG washer OR dryer (issue OR problem OR vibration OR noise OR error)',
    'site:reddit.com/r/Appliances LG (washer OR dryer OR fridge)',
    'site:reddit.com/r/appliancerepair LG (error OR code OR repair)',
    'site:reddit.com/r/refrigerators LG InstaView OR French door',
    'site:reddit.com/r/BuyItForLife LG appliance experience',
    'site:reddit.com LG "Smart Diagnosis" OR ThinQ app review',
    'site:reddit.com LG dishwasher "QuadWash" OR review OR rack',
  ],
  AirConditioner: [
    'site:reddit.com "LG AC" OR "LG air conditioner" OR "dual inverter" review OR recommend',
    'site:reddit.com LG AC (noise OR "energy saving" OR cooling OR installation OR issue)',
    'site:reddit.com/r/AirConditioners LG (window OR portable OR mini-split)',
    'site:reddit.com LG "Artcool" OR mini-split installation experience',
  ],
  StanbyME: [
    'site:reddit.com StanbyME OR "Stand by Me" LG review OR recommend OR worth',
    'site:reddit.com/r/StanbyME LG (review OR discussion OR setup OR tips)',
    'site:reddit.com StanbyME (battery OR portable OR streaming OR setup)',
  ],
  LG_UserHub: [
    'site:reddit.com/r/LG_UserHub LG (review OR discussion OR announcement OR tips)',
    'site:reddit.com/r/LG_UserHub (product OR firmware OR update OR feature)',
  ],
};

// 직접 스크레이핑할 서브레딧 핫 페이지 (Phase 2 폴백용)
const DIRECT_SUBREDDITS: { sub: string; category: string }[] = [
  { sub: "OLED", category: "TV" },
  { sub: "4kTV", category: "TV" },
  { sub: "OLED_Gaming", category: "TV" },
  { sub: "Monitors", category: "Monitor" },
  { sub: "ultrawidemasterrace", category: "Monitor" },
  { sub: "LGgram", category: "Laptop" },
  { sub: "Soundbars", category: "Audio" },
  { sub: "appliances", category: "HomeAppliance" },
  { sub: "refrigerators", category: "HomeAppliance" },
  { sub: "appliancerepair", category: "HomeAppliance" },
  { sub: "AirConditioners", category: "AirConditioner" },
  { sub: "StanbyME", category: "StanbyME" },
  { sub: "LG_UserHub", category: "LG_UserHub" },
];

// ══════════════════════════════════════════════════════════════
//  BUCKET CLASSIFICATION
// ══════════════════════════════════════════════════════════════

type Bucket = "review" | "voc" | "question";

function classifyBucket(text: string): Bucket {
  const t = text.toLowerCase();
  const vocPatterns = [/disappointed|frustrated|terrible|defective|broken|refund|return/i, /not working|stopped|issue|problem|bug|error|crash/i, /regret|waste|do not buy|avoid|worst/i, /customer service|support ticket|repair/i];
  let vScore = 0;
  for (const p of vocPatterns) if (p.test(t)) vScore++;
  if (vScore >= 2) return "voc";

  const qPatterns = [/should\s+i|worth\s+(it|buying)|vs\.?|versus|compared?\s+to/i, /recommend|suggestion|advice|help/i, /how\s+(do|does|is|can|to|much)|what\s+(is|are|should)/i, /\?$/m];
  let qScore = 0;
  for (const p of qPatterns) if (p.test(t)) qScore++;
  if (qScore >= 2) return "question";

  if (vScore >= 1 && qScore === 0) return "voc";
  if (qScore >= 1) return "question";
  return "review";
}

// ══════════════════════════════════════════════════════════════
//  AI EXTRACTION PROMPT
// ══════════════════════════════════════════════════════════════

const REDDIT_EXTRACTION_PROMPT = `You are a Reddit data extractor for LG Electronics product intelligence. Extract individual posts/comments from the given Reddit content.

For each post/comment, return a JSON array of objects:
- model_number: string (LG model if found, else use category like "OLED TV General")
- display_name: string (full product name)
- category: string (TV, Monitor, Laptop, Audio, Washer, Dryer, Refrigerator, Air Conditioner, Robot Vacuum, StanbyME)
- title: string (post title or summary, max 200 chars)
- content: string (post/comment text, max 3000 chars, preserve original wording)
- author: string or null (Reddit username without u/)
- sentiment: "positive" | "negative" | "neutral" | "mixed"
- sentiment_score: number 0-1
- published_at: string ISO date or null
- subreddit: string (the subreddit name)
- post_type: "post" | "comment"
- upvotes: number or null
- is_lg_relevant: boolean (true only if specifically about LG product)

RULES:
- Only include content specifically about LG Electronics products
- Exclude generic mentions, memes, or off-topic content
- Preserve the original voice — do not paraphrase
- ALL text in English
- If content has both post and relevant comments, extract each separately
- Return ONLY valid JSON array, no markdown`;

// ══════════════════════════════════════════════════════════════
//  ADAPTIVE SCHEDULER (insane-search inspired)
//  Phase 0: Firecrawl search
//  Phase 1: Reddit public JSON API (.json)
//  Phase 2: old.reddit.com direct scrape via Firecrawl
//  Phase 3: Bing search fallback via Firecrawl
// ══════════════════════════════════════════════════════════════

const UA_POOL = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

function pickUA(): string {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

interface FetchResult {
  content: string;
  url: string;
  source: string; // which phase succeeded
}

// ─── Rate limiting helper ─────────────────────────────────────
const REDDIT_RATE_LIMIT_MS = 1000;
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Quality filter (loose: selftext>30 OR score>2) ───────────
function passesQualityFilter(selftext: string, score: number): boolean {
  return (selftext && selftext.length > 30) || (score || 0) > 2;
}

// ─── Phase 1: Reddit public JSON (per-subreddit listing) ──────
// Returns posts AND raw metadata so caller can apply quality filter
async function fetchSubredditJson(
  sub: string,
  listing: "hot" | "new" | "top" = "new",
  timeFilter: "week" | "month" | "year" | "all" = "week",
): Promise<FetchResult[]> {
  const url = `https://www.reddit.com/r/${sub}/${listing}.json?limit=25&t=${timeFilter}&raw_json=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": pickUA(), "Accept": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const posts = json?.data?.children || [];
  const results: FetchResult[] = [];
  for (const p of posts) {
    const d = p.data;
    if (!d) continue;
    const selftext = d.selftext || "";
    const score = d.ups || d.score || 0;
    if (!passesQualityFilter(selftext, score)) continue;
    const block = `Title: ${d.title || ""}\nAuthor: ${d.author || ""}\nUpvotes: ${score}\nSubreddit: r/${d.subreddit || sub}\nURL: https://reddit.com${d.permalink || ""}\nCreated: ${new Date((d.created_utc || 0) * 1000).toISOString()}\n\n${selftext}`;
    results.push({
      content: block.slice(0, 4500),
      url: `https://reddit.com${d.permalink || ""}`,
      source: "reddit_json",
    });
  }
  return results;
}

// ─── Phase 1b: Reddit search JSON (sort=new, t=week for fresh) ─
async function fetchRedditSearchJson(query: string): Promise<FetchResult[]> {
  // Strip "site:reddit.com" and any "r/<sub>" hint, plus operators
  const cleanedQ = query
    .replace(/site:reddit\.com\/?(r\/[\w_]+)?/gi, "")
    .replace(/[()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleanedQ) return [];
  // Detect optional subreddit restriction in original query
  const subMatch = query.match(/site:reddit\.com\/r\/([\w_]+)/i);
  const baseUrl = subMatch
    ? `https://www.reddit.com/r/${subMatch[1]}/search.json?restrict_sr=1`
    : `https://www.reddit.com/search.json?`;
  const url = `${baseUrl}&q=${encodeURIComponent(cleanedQ)}&sort=new&limit=25&t=week&raw_json=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": pickUA(), "Accept": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const posts = json?.data?.children || [];
  const results: FetchResult[] = [];
  for (const p of posts.slice(0, 20)) {
    const d = p.data || {};
    const selftext = d.selftext || "";
    const score = d.ups || d.score || 0;
    if (!passesQualityFilter(selftext, score)) continue;
    const block = `Title: ${d.title || ""}\nAuthor: ${d.author || ""}\nUpvotes: ${score}\nSubreddit: r/${d.subreddit || ""}\nURL: https://reddit.com${d.permalink || ""}\nCreated: ${new Date((d.created_utc || 0) * 1000).toISOString()}\n\n${selftext}`;
    results.push({
      content: block.slice(0, 4500),
      url: `https://reddit.com${d.permalink || ""}`,
      source: "reddit_search_json",
    });
  }
  return results;
}

// ─── Phase 1c: Comments JSON for a specific post ───────────────
async function fetchCommentsJson(permalink: string): Promise<string> {
  const url = `https://www.reddit.com${permalink.replace(/\/$/, "")}.json?limit=20&depth=2`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": pickUA(), "Accept": "application/json" },
    });
    if (!res.ok) return "";
    const json = await res.json();
    if (!Array.isArray(json) || json.length < 2) return "";
    const comments = json[1]?.data?.children || [];
    const out: string[] = [];
    for (const c of comments.slice(0, 12)) {
      const cd = c.data;
      if (!cd?.body) continue;
      out.push(`[Comment by u/${cd.author || "anon"} | ${cd.ups || 0} upvotes]: ${cd.body}`);
    }
    return out.join("\n\n").slice(0, 6000);
  } catch {
    return "";
  }
}

// ─── Phase 0: Firecrawl search ─────────────────────────────────
async function firecrawlSearch(query: string, apiKey: string): Promise<FetchResult[]> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 6, scrapeOptions: { formats: ["markdown"] } }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(`[P0] Firecrawl HTTP ${res.status}: ${txt.slice(0, 200)}`);
      return [];
    }
    const json = await res.json();
    const rawCount = (json.data || []).length;
    const mapped = (json.data || []).map((r: any) => ({
      content: r.markdown || r.description || "",
      url: r.url || "",
      source: "firecrawl_search",
    }));
    const filtered = mapped.filter((r: FetchResult) => r.content.length > 80);
    console.log(`[P0] Firecrawl raw=${rawCount} kept(content>80)=${filtered.length} q="${query.slice(0, 60)}"`);
    return filtered;
  } catch (e) {
    console.warn(`[P0] Firecrawl exception: ${e}`);
    return [];
  }
}

// ─── Phase 2: old.reddit.com direct scrape via Firecrawl ───────
async function firecrawlScrapeOldReddit(url: string, apiKey: string): Promise<string> {
  const oldUrl = url.replace("www.reddit.com", "old.reddit.com").replace("https://reddit.com", "https://old.reddit.com");
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: oldUrl, formats: ["markdown"] }),
    });
    if (!res.ok) {
      console.warn(`[P2] Firecrawl scrape HTTP ${res.status} ${oldUrl}`);
      return "";
    }
    const json = await res.json();
    return json.data?.markdown || "";
  } catch (e) {
    console.warn(`[P2] Firecrawl scrape exception: ${e}`);
    return "";
  }
}

// ─── Phase 3: Bing search fallback ─────────────────────────────
async function firecrawlBingFallback(query: string, apiKey: string): Promise<FetchResult[]> {
  const bingQ = `${query} reddit`;
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: bingQ, limit: 5, scrapeOptions: { formats: ["markdown"] } }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(`[P3] Bing fallback HTTP ${res.status}: ${txt.slice(0, 200)}`);
      return [];
    }
    const json = await res.json();
    const rawCount = (json.data || []).length;
    const mapped = (json.data || []).map((r: any) => ({
      content: r.markdown || r.description || "",
      url: r.url || "",
      source: "bing_fallback",
    }));
    const filtered = mapped.filter((r: FetchResult) => r.content.length > 80);
    console.log(`[P3] Bing raw=${rawCount} kept=${filtered.length}`);
    return filtered;
  } catch (e) {
    console.warn(`[P3] Bing fallback exception: ${e}`);
    return [];
  }
}

// ─── Adaptive scheduler: Reddit JSON FIRST, Firecrawl as fallback ─
async function adaptiveCollect(
  query: string,
  firecrawlKey: string,
  diag: Record<string, number>,
  phaseStats: Record<string, number>,
): Promise<FetchResult[]> {
  let results: FetchResult[] = [];

  // Phase 1 (PRIMARY): Reddit native search JSON — sort=new&t=week
  try {
    const redditResults = await fetchRedditSearchJson(query);
    diag.p1_results = (diag.p1_results || 0) + redditResults.length;
    console.log(`[P1] Reddit JSON search: ${redditResults.length} for "${query.slice(0, 60)}"`);
    results.push(...redditResults);
  } catch (err) {
    phaseStats["reddit_search_error"] = (phaseStats["reddit_search_error"] || 0) + 1;
    console.error(`[P1 FAIL] Reddit search "${query.slice(0, 50)}":`, err);
  }

  if (results.length >= 3) {
    console.log(`[Phase1 ✓] Reddit JSON: ${results.length}`);
    return results;
  }

  // Phase 0 (FALLBACK): Firecrawl search — only if Reddit JSON returned <3
  try {
    const fcResults = await firecrawlSearch(query, firecrawlKey);
    diag.p0_results = (diag.p0_results || 0) + fcResults.length;
    if (fcResults.length > 0) {
      console.log(`[Phase0 fallback ✓] Firecrawl: ${fcResults.length}`);
      results.push(...fcResults);
    }
  } catch (err) {
    phaseStats["firecrawl_search_error"] = (phaseStats["firecrawl_search_error"] || 0) + 1;
    console.error(`[P0 FAIL] Firecrawl "${query.slice(0, 50)}":`, err);
  }

  // Phase 3 (LAST RESORT): Bing fallback
  if (results.length < 2) {
    try {
      const bingResults = await firecrawlBingFallback(query, firecrawlKey);
      diag.p3_results = (diag.p3_results || 0) + bingResults.length;
      console.log(`[Phase3 ${bingResults.length > 0 ? "✓" : "✗"}] Bing fallback: ${bingResults.length}`);
      results.push(...bingResults);
    } catch (err) {
      phaseStats["bing_fallback_error"] = (phaseStats["bing_fallback_error"] || 0) + 1;
      console.error(`[P3 FAIL] Bing:`, err);
    }
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing required env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let mode: "all" | "review" | "voc" | "question" = "all";
  let categoryFilter: string | null = null;
  let deepComments = true;
  let maxQueriesPerCategory = 10;
  let includeDirectSubs = true;

  try {
    const body = await req.json();
    if (body.mode) mode = body.mode;
    if (body.category) categoryFilter = body.category;
    if (body.deepComments !== undefined) deepComments = body.deepComments;
    if (body.maxQueries) maxQueriesPerCategory = Math.min(Number(body.maxQueries), 15);
    if (body.includeDirectSubs !== undefined) includeDirectSubs = body.includeDirectSubs;
  } catch {
    // defaults
  }

  const { data: logEntry } = await supabase
    .from("collection_logs")
    .insert({ source: "reddit_collector_v3_adaptive", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  let totalCollected = 0;
  let totalSkipped = 0;
  const phaseStats: Record<string, number> = {};
  const errors: string[] = [];
  const diag: Record<string, number> = {
    queries_attempted: 0,
    queries_zero_results: 0,
    queries_short_batch: 0,
    ai_extractions_attempted: 0,
    ai_extractions_failed: 0,
    ai_returned_empty: 0,
    ai_returned_items: 0,
    direct_subs_attempted: 0,
    direct_subs_zero_posts: 0,
  };

  try {
    const categories = categoryFilter
      ? { [categoryFilter]: REDDIT_QUERIES[categoryFilter] || [] }
      : REDDIT_QUERIES;

    // ── Phase A: Query-driven collection ──
    for (const [category, queries] of Object.entries(categories)) {
      const activeQueries = queries.slice(0, maxQueriesPerCategory);

      for (const query of activeQueries) {
        diag.queries_attempted += 1;
        try {
          console.log(`[${category}] Q: ${query.slice(0, 70)}...`);
          const results = await adaptiveCollect(query, FIRECRAWL_API_KEY, diag, phaseStats);

          if (results.length === 0) {
            diag.queries_zero_results += 1;
            errors.push(`No results: ${category} / ${query.slice(0, 50)}`);
            await sleep(REDDIT_RATE_LIMIT_MS);
            continue;
          }

          // Track which phase produced data
          for (const r of results) phaseStats[r.source] = (phaseStats[r.source] || 0) + 1;

          // Build batched content with optional comment enrichment
          let batchedContent = "";
          for (const result of results) {
            let content = result.content;

            if (deepComments && result.url.includes("/comments/")) {
              const permalink = result.url.replace(/^https?:\/\/[^/]+/, "");
              const comments = await fetchCommentsJson(permalink);
              if (comments) content += `\n\n--- COMMENTS ---\n${comments}`;
            } else if (deepComments && content.length < 400 && result.url) {
              const oldScrape = await firecrawlScrapeOldReddit(result.url, FIRECRAWL_API_KEY);
              if (oldScrape) content = oldScrape;
            }

            if (content.length >= 50) {
              batchedContent += `\n\n--- Reddit Result (${result.url || "unknown"}) [via ${result.source}] ---\n${content.slice(0, 4500)}`;
            }
          }

          if (batchedContent.length < 100) {
            diag.queries_short_batch += 1;
            console.warn(`[${category}] batched content too short (${batchedContent.length} chars), skipping AI`);
            await sleep(REDDIT_RATE_LIMIT_MS);
            continue;
          }

          // AI extraction
          diag.ai_extractions_attempted += 1;
          const extracted = await extractWithAI(batchedContent, category, LOVABLE_API_KEY);
          if (!extracted) {
            diag.ai_extractions_failed += 1;
            console.warn(`[${category}] AI extraction returned null`);
            await sleep(REDDIT_RATE_LIMIT_MS);
            continue;
          }
          if (extracted.length === 0) {
            diag.ai_returned_empty += 1;
            console.warn(`[${category}] AI returned empty array (no LG-relevant content found)`);
          } else {
            diag.ai_returned_items += extracted.length;
            console.log(`[${category}] AI extracted ${extracted.length} items`);
          }

          const stats = await persistReviews(supabase, extracted, category, mode);
          totalCollected += stats.collected;
          totalSkipped += stats.skipped;
          console.log(`[${category}] persisted=${stats.collected} skipped=${stats.skipped}`);
        } catch (queryErr) {
          phaseStats[`${category}_query_error`] = (phaseStats[`${category}_query_error`] || 0) + 1;
          errors.push(`Query ${category}: ${queryErr}`);
          console.error(`[FAIL] [${category}] query "${String(query).slice(0, 50)}":`, queryErr);
        }
        // Rate limit between queries (avoid Reddit 429)
        await sleep(REDDIT_RATE_LIMIT_MS);
      }
    }

    // ── Phase B: Direct subreddit JSON harvest (always-on safety net) ──
    if (includeDirectSubs) {
      const subsToFetch = categoryFilter
        ? DIRECT_SUBREDDITS.filter((s) => s.category === categoryFilter)
        : DIRECT_SUBREDDITS;

      for (const { sub, category } of subsToFetch) {
        diag.direct_subs_attempted += 1;
        try {
          console.log(`[Direct] r/${sub} (${category})`);
          const posts = await fetchSubredditJson(sub, "hot");
          if (posts.length === 0) {
            diag.direct_subs_zero_posts += 1;
            errors.push(`Direct r/${sub}: 0 posts`);
            continue;
          }
          phaseStats["direct_subreddit"] = (phaseStats["direct_subreddit"] || 0) + posts.length;

          let batched = "";
          for (const p of posts.slice(0, 15)) {
            let content = p.content;
            if (deepComments && p.url.includes("/comments/")) {
              const permalink = p.url.replace(/^https?:\/\/[^/]+/, "");
              const cmts = await fetchCommentsJson(permalink);
              if (cmts) content += `\n\n--- COMMENTS ---\n${cmts}`;
            }
            batched += `\n\n--- r/${sub} Post (${p.url}) ---\n${content.slice(0, 4500)}`;
          }

          if (batched.length < 200) {
            console.warn(`[Direct r/${sub}] batched too short (${batched.length})`);
            continue;
          }

          diag.ai_extractions_attempted += 1;
          const extracted = await extractWithAI(batched, category, LOVABLE_API_KEY);
          if (!extracted) {
            diag.ai_extractions_failed += 1;
            console.warn(`[Direct r/${sub}] AI extraction null`);
            continue;
          }
          if (extracted.length === 0) {
            diag.ai_returned_empty += 1;
          } else {
            diag.ai_returned_items += extracted.length;
          }

          const stats = await persistReviews(supabase, extracted, category, mode);
          totalCollected += stats.collected;
          totalSkipped += stats.skipped;
          console.log(`[Direct r/${sub}] persisted=${stats.collected} skipped=${stats.skipped}`);
        } catch (e) {
          errors.push(`Direct r/${sub}: ${e}`);
          console.error(`[Direct r/${sub}] error:`, e);
        }
      }
    }
  } catch (fatalErr) {
    errors.push(`Fatal: ${fatalErr}`);
    console.error("Fatal error:", fatalErr);
  }

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
    errors: errors.length,
    error_samples: errors.slice(0, 5),
    phase_stats: phaseStats,
    diagnostics: diag,
    config: { mode, categoryFilter, deepComments, maxQueriesPerCategory, includeDirectSubs },
  };

  console.log(`✅ Reddit collection v3 complete:`, JSON.stringify(result));

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ══════════════════════════════════════════════════════════════
//  AI + PERSISTENCE HELPERS
// ══════════════════════════════════════════════════════════════

async function extractWithAI(content: string, category: string, apiKey: string): Promise<any[] | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: REDDIT_EXTRACTION_PROMPT },
          { role: "user", content: `Category: ${category}\n\nReddit Content:\n${content.slice(0, 18000)}` },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(`[AI] extraction HTTP ${res.status} for ${category}: ${txt.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : null;
    } catch (parseErr) {
      console.warn(`[AI] JSON parse failed for ${category}: ${parseErr} | raw="${cleaned.slice(0, 200)}"`);
      return null;
    }
  } catch (e) {
    console.error(`[AI] extraction exception for ${category}:`, e);
    return null;
  }
}

async function persistReviews(
  supabase: any,
  reviews: any[],
  fallbackCategory: string,
  mode: string,
): Promise<{ collected: number; skipped: number }> {
  let collected = 0;
  let skipped = 0;
  const LG_OPERATORS = ["stanbyme_mod", "lg_techit"];

  for (const review of reviews) {
    if (!review.is_lg_relevant) continue;
    if (!review.content || review.content.length < 20) continue;

    const bucket = classifyBucket(`${review.title || ""} ${review.content}`);
    if (mode !== "all" && bucket !== mode) continue;

    const productId = await findOrCreateProduct(
      supabase,
      review.model_number || fallbackCategory,
      review.display_name || `LG ${fallbackCategory}`,
      review.category || fallbackCategory,
    );

    const contentHash = `reddit_${simpleHash(review.content.slice(0, 200))}`;
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("external_id", contentHash)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const authorLower = (review.author || "").toLowerCase();
    const isLgOperator = LG_OPERATORS.includes(authorLower);

    // Normalize subreddit: strip leading "r/" or "/r/" and any whitespace/slashes
    const rawSub = (review.subreddit || fallbackCategory || "").toString();
    const cleanSub = rawSub
      .replace(/^\/?r\//i, "")
      .replace(/[^a-z0-9_]/gi, "")
      .toLowerCase() || fallbackCategory.toLowerCase();

    const { error: insertErr } = await supabase.from("reviews").insert({
      product_id: productId,
      source: `reddit_${cleanSub}`,
      external_id: contentHash,
      author: review.author || null,
      title: (review.title || "").slice(0, 500),
      content: review.content.slice(0, 5000),
      sentiment: review.sentiment || "neutral",
      sentiment_score: review.sentiment_score ?? 0.5,
      rating: null,
      published_at: review.published_at || null,
      source_url: null,
      review_type: isLgOperator ? "official" : "organic",
      content_type: bucket,
      platform_type: "community",
      user_type: isLgOperator ? "lg_operator" : "actual_user",
    });

    if (!insertErr) collected++;
  }

  return { collected, skipped };
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const productCache = new Map<string, string>();

async function findOrCreateProduct(
  supabase: any,
  modelNumber: string,
  displayName: string,
  category: string,
): Promise<string> {
  const safeModel = modelNumber.replace(/['"]/g, "").slice(0, 100);
  const cacheKey = `${safeModel}_${category}`;
  if (productCache.has(cacheKey)) return productCache.get(cacheKey)!;

  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .or(`model_number.ilike.%${safeModel}%,display_name.ilike.%${safeModel}%`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    productCache.set(cacheKey, existing.id);
    return existing.id;
  }

  const genericModel = `Reddit_${category}_General`;
  const { data: genExisting } = await supabase
    .from("products")
    .select("id")
    .eq("model_number", genericModel)
    .maybeSingle();

  if (genExisting) {
    productCache.set(cacheKey, genExisting.id);
    return genExisting.id;
  }

  const { data: newProduct } = await supabase
    .from("products")
    .insert({
      model_number: genericModel,
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
