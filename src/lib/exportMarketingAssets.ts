import * as XLSX from "xlsx";
import type { SentimentResult } from "./sentiment";

/* ── Channel definitions (mirrored from MarketingHub) ── */
interface ChannelDef {
  key: string;
  label: string;
  group: string; // PDP, SNS, Email, Display, Video, Affiliate
  fields: { name: string; max: number }[];
}

const CHANNELS: ChannelDef[] = [
  // PDP / Search
  { key: "google_pmax", label: "Google PMAX", group: "Search", fields: [{ name: "Headline", max: 30 }, { name: "Description", max: 90 }] },
  { key: "google_rsa", label: "Google Search RSA", group: "Search", fields: [{ name: "Headline", max: 30 }, { name: "Description", max: 90 }] },
  { key: "lgcom_pdp", label: "LG.com PDP 배너", group: "PDP", fields: [{ name: "Headline", max: 50 }, { name: "Body", max: 80 }, { name: "CTA", max: 35 }] },
  // SNS
  { key: "meta_feed", label: "Meta Feed", group: "SNS", fields: [{ name: "Primary Text", max: 125 }, { name: "Headline", max: 27 }, { name: "Description", max: 27 }, { name: "CTA", max: 20 }] },
  { key: "meta_stories", label: "Meta Stories/Reels", group: "SNS", fields: [{ name: "Caption", max: 125 }, { name: "CTA", max: 20 }] },
  { key: "meta_carousel", label: "Meta Carousel", group: "SNS", fields: [{ name: "Headline", max: 40 }, { name: "Body", max: 125 }, { name: "CTA", max: 20 }] },
  // Display
  { key: "google_gdn", label: "Google Display/GDN", group: "Display", fields: [{ name: "Short Headline", max: 25 }, { name: "Long Headline", max: 90 }, { name: "Description", max: 90 }, { name: "CTA", max: 15 }] },
  { key: "lgcom_hero", label: "LG.com Hero Banner", group: "Display", fields: [{ name: "Eyebrow", max: 40 }, { name: "Headline", max: 50 }, { name: "Subheadline", max: 80 }, { name: "CTA", max: 35 }] },
  { key: "criteo_retargeting", label: "Criteo Retargeting", group: "Display", fields: [{ name: "Headline", max: 25 }, { name: "Description", max: 38 }, { name: "CTA", max: 15 }] },
  { key: "criteo_sponsored", label: "Criteo Sponsored", group: "Display", fields: [{ name: "Headline", max: 25 }, { name: "Description", max: 38 }, { name: "CTA", max: 15 }] },
  // Video
  { key: "youtube_bumper", label: "YouTube Bumper 6s", group: "Video", fields: [{ name: "Script", max: 30 }, { name: "Visual Note", max: 90 }] },
  { key: "youtube_trueview", label: "YouTube TrueView", group: "Video", fields: [{ name: "Hook", max: 60 }, { name: "Body", max: 200 }, { name: "CTA", max: 20 }] },
  // Email/CRM
  { key: "lgcom_email", label: "LG.com Email/CRM", group: "Email", fields: [{ name: "Subject", max: 60 }, { name: "Body", max: 200 }, { name: "CTA", max: 25 }] },
  // Affiliate
  { key: "affiliate_reviewer", label: "Affiliate 리뷰어 브리프", group: "Affiliate", fields: [{ name: "Headline", max: 60 }, { name: "Key Point", max: 80 }, { name: "CTA", max: 25 }] },
  { key: "affiliate_publisher", label: "Affiliate 퍼블리셔 배너", group: "Affiliate", fields: [{ name: "Headline", max: 40 }, { name: "Description", max: 90 }, { name: "CTA", max: 20 }] },
];

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

function cleanCopy(text: string): string {
  return text.replace(/\b(best|#1|unprecedented|most reliable|top-rated|number one|world's first|unmatched|ultimate)\b/gi, "").replace(/\s{2,}/g, " ").trim();
}

function generateCopyForExport(ch: ChannelDef, pName: string, sentiment: SentimentResult): Record<string, string> {
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const s2 = sentiment.keywords.positive?.[1] || "performance";
  const pain = sentiment.keywords.negative?.[0] || "";
  const scene = sentiment.usageScenes?.[0] || "living room";

  const vals: Record<string, string> = {};
  for (const f of ch.fields) {
    let val = "";
    switch (f.name) {
      case "Headline": case "Short Headline": val = `${pName} — ${s1} Redefined`; break;
      case "Long Headline": val = `Experience ${s1} and ${s2} with ${pName}. A new standard.`; break;
      case "Description": case "Body": case "Primary Text": val = pain ? `Worried about "${pain}"? Real users say otherwise. ${s1} praised consistently.` : `Praised for outstanding ${s1} and ${s2}. See why.`; break;
      case "CTA": val = "Shop Now"; break;
      case "Eyebrow": val = "New Arrival"; break;
      case "Subheadline": val = `${s1} and ${s2} — praised by real users`; break;
      case "Subject": val = `${pName}: Exclusive Offer Inside`; break;
      case "Caption": val = `Meet ${pName} in your ${scene}. "${s1}" — the feature customers love.`; break;
      case "Script": val = `${pName} — ${s1}. Experience it.`; break;
      case "Visual Note": val = `Product hero → lifestyle scene in ${scene} → CTA overlay`; break;
      case "Hook": val = `What if ${pain || "your concern"} wasn't an issue? Meet ${pName}.`; break;
      case "Key Point": val = `✓ ${s1} ✓ ${s2} ✓ Trusted by real users`; break;
      default: val = `${pName} — ${s1}`;
    }
    vals[f.name] = truncate(cleanCopy(val), f.max);
  }
  return vals;
}

/* ── FAQ generation (simplified for export) ── */
function generateFaqForExport(pName: string, sentiment: SentimentResult) {
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const s2 = sentiment.keywords.positive?.[1] || "performance";
  const pain = sentiment.keywords.negative?.[0] || "";
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;

  const types = [
    { type: "PDP", purpose: "구매 전환" },
    { type: "GEO", purpose: "AI 검색 최적화" },
    { type: "SEO", purpose: "Google FAQ Schema" },
    { type: "CRM/CS", purpose: "고객 응대" },
  ];

  const faqs: { type: string; purpose: string; question: string; answer: string }[] = [];

  for (const t of types) {
    faqs.push(
      { ...t, question: `What do real users say about ${pName}?`, answer: `Based on ${total} reviews, users consistently praise ${s1} and ${s2}.${pain ? ` Some mention "${pain}" but overall satisfaction is high.` : ""}` },
      { ...t, question: `Is ${pName} worth buying?`, answer: `With ${Math.round((sentiment.positive / Math.max(total, 1)) * 100)}% positive reviews highlighting ${s1}, ${pName} delivers strong value.` },
      { ...t, question: `What are the main features of ${pName}?`, answer: `Key strengths include ${s1} and ${s2}, validated by real user feedback across multiple channels.` },
    );
  }
  return faqs;
}

/* ── SEO/GEO scripts ── */
function generateSeoGeoForExport(pName: string, sentiment: SentimentResult) {
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const s2 = sentiment.keywords.positive?.[1] || "performance";
  const pain = sentiment.keywords.negative?.[0] || "";

  return [
    {
      type: "SEO Brief",
      content: `Target Keyword: ${pName} review\nMeta Title: ${pName} Review — ${s1} & ${s2} | LG\nMeta Description: Discover why users praise ${pName} for ${s1} and ${s2}.\nH1: ${pName} — Real User Reviews\n  H2: Top Strengths: ${s1}, ${s2}\n  H2: ${pain ? `Addressing "${pain}"` : "What Users Say"}\n    H3: Performance in Daily Use\n    H3: Value for Money`,
    },
    {
      type: "GEO Script",
      content: `${pName} is praised for ${s1} and ${s2} based on real user reviews.${pain ? ` While some mention "${pain}", most users report satisfaction.` : ""} Key specs and user-validated strengths make it a strong contender in its category.`,
    },
  ];
}

/* ── Main export function ── */
export function exportMarketingAssets(
  productName: string,
  displayName: string,
  sentiment: SentimentResult,
) {
  const pName = displayName || productName;
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Ad Copy (all channels) ──
  const adRows: Record<string, string>[] = [];
  const groups = [...new Set(CHANNELS.map(c => c.group))];
  for (const group of groups) {
    const groupChannels = CHANNELS.filter(c => c.group === group);
    for (const ch of groupChannels) {
      const copy = generateCopyForExport(ch, pName, sentiment);
      for (const [fieldName, value] of Object.entries(copy)) {
        const maxChar = ch.fields.find(f => f.name === fieldName)?.max || 0;
        adRows.push({
          "그룹": group,
          "채널": ch.label,
          "필드": fieldName,
          "카피": value,
          "글자수": `${value.length}`,
          "최대": `${maxChar}`,
          "상태": value.length <= maxChar ? "✅ OK" : "⚠️ Over",
        });
      }
    }
  }
  const wsAd = XLSX.utils.json_to_sheet(adRows);
  wsAd["!cols"] = [{ wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 60 }, { wch: 8 }, { wch: 6 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsAd, "Ad Copy");

  // ── Sheet 2: FAQ (4 types) ──
  const faqRows = generateFaqForExport(pName, sentiment).map(f => ({
    "유형": f.type,
    "목적": f.purpose,
    "질문 (Q)": f.question,
    "답변 (A)": f.answer,
  }));
  const wsFaq = XLSX.utils.json_to_sheet(faqRows);
  wsFaq["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 40 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsFaq, "FAQ");

  // ── Sheet 3: SEO & GEO ──
  const seoGeo = generateSeoGeoForExport(pName, sentiment);
  const wsSeo = XLSX.utils.json_to_sheet(seoGeo.map(s => ({
    "유형": s.type,
    "콘텐츠": s.content,
  })));
  wsSeo["!cols"] = [{ wch: 14 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsSeo, "SEO & GEO");

  // ── Sheet 4: Image Prompts ──
  const imageAssets = [
    { size: "1920×600", platform: "LG.com Hero Banner", tool: "LG Twin Crew" },
    { size: "1080×1080", platform: "Meta Feed", tool: "Midjourney · Firefly" },
    { size: "1080×1920", platform: "Meta Stories/Reels", tool: "Midjourney · Firefly" },
    { size: "1280×720", platform: "YouTube Thumbnail", tool: "Midjourney · Firefly" },
    { size: "300×250", platform: "Google Display/GDN", tool: "LG Twin Crew" },
    { size: "728×90", platform: "Leaderboard Banner", tool: "LG Twin Crew" },
    { size: "320×50", platform: "Mobile Banner", tool: "LG Twin Crew" },
  ];
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const scene = sentiment.usageScenes?.[0] || "modern living space";
  const imgRows = imageAssets.map(ia => ({
    "사이즈": ia.size,
    "플랫폼": ia.platform,
    "제작 툴": ia.tool,
    "프롬프트": ia.platform.includes("LG.com")
      ? `${pName} Hero Banner · ${ia.size} · Dark cinematic background, highlight "${s1}". Premium finish.`
      : ia.platform.includes("Meta Feed")
        ? `${pName} product photography, warm lifestyle, ${scene} setting, 8k, photorealistic --ar 1:1 --v 6`
        : ia.platform.includes("Stories")
          ? `${pName} in ${scene}, vertical composition, lifestyle, UGC style --ar 9:16 --v 6`
          : `${pName} display ad · ${ia.size} · Clean product shot, ${s1} highlight`,
  }));
  const wsImg = XLSX.utils.json_to_sheet(imgRows);
  wsImg["!cols"] = [{ wch: 14 }, { wch: 25 }, { wch: 22 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsImg, "Image Prompts");

  // ── Sheet 5: Summary ──
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const summaryData = [
    ["제품명", pName],
    ["모델번호", productName],
    ["총 리뷰 수", total],
    ["긍정 비율", `${Math.round((sentiment.positive / Math.max(total, 1)) * 100)}%`],
    ["부정 비율", `${Math.round((sentiment.negative / Math.max(total, 1)) * 100)}%`],
    ["감성 점수", `${sentiment.compositeScore}/100`],
    ["긍정 키워드", (sentiment.keywords.positive || []).join(", ")],
    ["부정 키워드", (sentiment.keywords.negative || []).join(", ")],
    ["내보내기 일시", new Date().toLocaleString("ko-KR")],
    ["", ""],
    ["시트 구성", ""],
    ["Ad Copy", `${CHANNELS.length}개 채널 × ${groups.length}개 그룹`],
    ["FAQ", "PDP / GEO / SEO / CRM 4종 × 3문항"],
    ["SEO & GEO", "SEO 브리프 + GEO 스크립트"],
    ["Image Prompts", `${imageAssets.length}개 사이즈`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 18 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ── Download ──
  const fileName = `Marketing_Assets_${productName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
