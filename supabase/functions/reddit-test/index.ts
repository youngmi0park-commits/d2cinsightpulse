// Diagnostic-only function: hit a single subreddit + keyword via Reddit's
// public JSON API and return the raw HTTP status, post count, and first post title.
// NOT called by cron — manual verification only.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UA = "D2CInsightPulse/1.0 (LG Electronics)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow override via query string: ?sub=lgtvs&q=LG%20OLED
  const url = new URL(req.url);
  const sub = url.searchParams.get("sub") || "lgtvs";
  const keyword = url.searchParams.get("q") || "LG OLED";

  const redditUrl =
    `https://www.reddit.com/r/${sub}/search.json` +
    `?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=new&limit=10&t=week&raw_json=1`;

  const result: Record<string, unknown> = {
    sub,
    keyword,
    reddit_url: redditUrl,
  };

  try {
    const res = await fetch(redditUrl, {
      headers: { "User-Agent": UA, "Accept": "application/json" },
    });
    result.reddit_status = res.status;

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      result.error = `HTTP ${res.status}: ${txt.slice(0, 200)}`;
      result.post_count = 0;
      return new Response(JSON.stringify(result, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const children = json?.data?.children || [];
    result.post_count = children.length;
    result.first_post_title = children[0]?.data?.title || null;
    result.first_post_subreddit = children[0]?.data?.subreddit || null;
    result.first_post_score = children[0]?.data?.ups ?? null;
    result.first_post_created = children[0]?.data?.created_utc
      ? new Date(children[0].data.created_utc * 1000).toISOString()
      : null;
    result.sample_titles = children.slice(0, 5).map((c: any) => c?.data?.title).filter(Boolean);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    result.exception = String(err);
    return new Response(JSON.stringify(result, null, 2), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
