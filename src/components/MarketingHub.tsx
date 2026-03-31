import { useState, useMemo } from "react";
import { FaqToolkitPanel } from "@/components/FaqToolkitPanel";
import { useLang } from "@/contexts/LanguageContext";
import {
  Wrench, Copy, Eye, MousePointer, ShoppingCart, RefreshCw,
  TrendingUp, Check, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { GeoMessage, MarketingOutput } from "@/lib/formatMessage";
import type { SentimentResult } from "@/lib/sentiment";

interface MarketingHubProps {
  geoMessages: GeoMessage[];
  productName: string;
  displayName: string;
  totalReviews: number;
  marketing: MarketingOutput;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string; source?: string }[];
}

/* ── Funnel definitions ── */
const AD_FUNNELS = [
  {
    key: "awareness",
    icon: <Eye className="h-4 w-4" />,
    labelKo: "인지도 제고",
    descKo: "브랜드 인지도, 도달, 노출",
    channels: ["YouTube Bumper", "Meta Stories", "Display"],
    messageCore: "감성 훅, 시각 임팩트",
  },
  {
    key: "consideration",
    icon: <MousePointer className="h-4 w-4" />,
    labelKo: "방문 유도 & 고려",
    descKo: "사이트 방문, 상세페이지 조회",
    channels: ["PMAX", "Meta Carousel", "Affiliate"],
    messageCore: "기능 증명, 리뷰 신뢰",
  },
  {
    key: "conversion",
    icon: <ShoppingCart className="h-4 w-4" />,
    labelKo: "구매 전환",
    descKo: "장바구니, 결제, 구매",
    channels: ["Search RSA", "Criteo", "LG.com"],
    messageCore: "오퍼, 긴급성, CTA",
  },
  {
    key: "retention",
    icon: <RefreshCw className="h-4 w-4" />,
    labelKo: "재구매 & 리텐션",
    descKo: "로열티, 크로스셀, 반복 구매",
    channels: ["Email CRM", "Meta", "Affiliate"],
    messageCore: "업그레이드, 커뮤니티",
  },
];

/* ── Channel text limits ── */
const CHANNEL_LIMITS: Record<string, { headline: number; body: number; cta: number }> = {
  "YouTube Bumper": { headline: 30, body: 90, cta: 15 },
  "Meta Stories": { headline: 40, body: 125, cta: 20 },
  Display: { headline: 30, body: 90, cta: 15 },
  PMAX: { headline: 30, body: 90, cta: 15 },
  "Meta Carousel": { headline: 40, body: 125, cta: 20 },
  Affiliate: { headline: 50, body: 150, cta: 20 },
  "Search RSA": { headline: 30, body: 90, cta: 15 },
  Criteo: { headline: 30, body: 90, cta: 15 },
  "LG.com": { headline: 50, body: 150, cta: 35 },
  "Email CRM": { headline: 60, body: 200, cta: 25 },
  Meta: { headline: 40, body: 125, cta: 20 },
};

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

/* ── Compliance quick-check ── */
function quickComply(text: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const lower = text.toLowerCase();
  const superlatives = ["best", "#1", "unprecedented", "most reliable", "top-rated", "number one", "world's first", "unmatched", "ultimate"];
  const comparatives = ["better than", "superior to", "beats", "outperforms"];
  for (const s of superlatives) if (lower.includes(s)) issues.push(`Superlative "${s}" removed`);
  for (const c of comparatives) if (lower.includes(c)) issues.push(`Comparative "${c}" flagged`);
  return { ok: issues.length === 0, issues };
}

function cleanCopy(text: string): string {
  return text
    .replace(/\b(best|#1|unprecedented|most reliable|top-rated|number one|world's first|unmatched|ultimate)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ── Generate channel copy based on funnel + product insights ── */
function generateChannelCopy(
  funnelKey: string,
  channel: string,
  productName: string,
  sentiment: SentimentResult,
) {
  const s1 = sentiment.keywords.positive?.[0] || "quality";
  const s2 = sentiment.keywords.positive?.[1] || "performance";
  const pain = sentiment.keywords.negative?.[0] || "";
  const scene = sentiment.usageScenes?.[0] || "living room";
  const posCount = sentiment.positive;
  const limits = CHANNEL_LIMITS[channel] || { headline: 50, body: 150, cta: 20 };

  const templates: Record<string, Record<string, { headline: string; body: string; cta: string }>> = {
    awareness: {
      "YouTube Bumper": {
        headline: `${productName} — ${s1} Redefined`,
        body: `Chosen by ${posCount} verified users. ${s2} that speaks for itself.`,
        cta: "Discover Now",
      },
      "Meta Stories": {
        headline: `Meet ${productName} in Your ${scene}`,
        body: `"${s1}" — the keyword customers keep mentioning. Experience it yourself.`,
        cta: "Learn More",
      },
      Display: {
        headline: `${productName} | ${s1} · ${s2}`,
        body: `${posCount} real reviews prove the quality.`,
        cta: "See Details",
      },
    },
    consideration: {
      PMAX: {
        headline: `${productName} — Real ${s1} Reviews`,
        body: `${posCount} verified reviews. See how ${s2} performs in real life.`,
        cta: "View Details",
      },
      "Meta Carousel": {
        headline: `Why ${productName}?`,
        body: `① ${s1} ② ${s2} — Top strengths extracted from real user reviews.`,
        cta: "Compare Now",
      },
      Affiliate: {
        headline: `${productName} Review Summary`,
        body: `${posCount} reviews analyzed: "${s1}" is the most mentioned strength.`,
        cta: "Shop Now",
      },
    },
    conversion: {
      "Search RSA": {
        headline: `${productName} — ${s1} | Buy Now`,
        body: `${posCount} users chose ${s2}. ${pain ? `Worried about "${pain}"? Reviews tell a different story.` : "Limited-time offer available."}`,
        cta: "Buy Now",
      },
      Criteo: {
        headline: `${productName} Is Calling You Back`,
        body: `You viewed ${productName} before. Now is the perfect time to make it yours.`,
        cta: "Add to Cart",
      },
      "LG.com": {
        headline: `${productName} — Exclusive LG.com Offer`,
        body: `${posCount} real users love the ${s1}. Get an exclusive deal only on LG.com.`,
        cta: "Order Now",
      },
    },
    retention: {
      "Email CRM": {
        headline: `${productName} Owner — A New Experience Awaits`,
        body: `Loved the ${s1}? Explore our upgraded lineup designed for you.`,
        cta: "See What's New",
      },
      Meta: {
        headline: `Exclusive for ${productName} Owners`,
        body: `A special offer for those who love ${s1}. Reserved just for you.`,
        cta: "Claim Offer",
      },
      Affiliate: {
        headline: `${productName} Accessories & Bundles`,
        body: `Recommended pairings that complement your ${productName} experience.`,
        cta: "View Bundles",
      },
    },
  };

  const raw = templates[funnelKey]?.[channel] || {
    headline: `${productName} — ${s1}`,
    body: `Chosen by ${posCount} real users.`,
    cta: "Learn More",
  };

  // Clean compliance + truncate to limits
  const headline = truncate(cleanCopy(raw.headline), limits.headline);
  const body = truncate(cleanCopy(raw.body), limits.body);
  const cta = truncate(cleanCopy(raw.cta), limits.cta);
  const compliance = quickComply(raw.headline + " " + raw.body + " " + raw.cta);

  return { headline, body, cta, limits, compliance };
}

/* ── Section header ── */
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pb-3 mb-4 border-b border-border">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function MarketingHub({
  geoMessages,
  productName,
  displayName,
  totalReviews,
  marketing,
  sentiment,
  reviews,
}: MarketingHubProps) {
  const { t } = useLang();
  const [selectedFunnel, setSelectedFunnel] = useState("awareness");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    faq: false, crm: false,
  });

  const toggleSection = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const copyText = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
    toast.success(t("Copied!", "복사 완료!"));
  };

  const pName = displayName || productName;
  const activeFunnel = AD_FUNNELS.find(f => f.key === selectedFunnel)!;

  /* Channel copies for active funnel */
  const channelCopies = useMemo(() => {
    return activeFunnel.channels.map(ch => ({
      channel: ch,
      ...generateChannelCopy(selectedFunnel, ch, pName, sentiment),
    }));
  }, [selectedFunnel, pName, sentiment, activeFunnel]);

  /* Search intent ad ideas */
  const searchIntentIdeas = useMemo(() => {
    const kw = sentiment.keywords.positive?.slice(0, 3) || [];
    const pain = sentiment.keywords.negative?.slice(0, 2) || [];
    const ideas: { query: string; adIdea: string }[] = [];

    for (const k of kw) {
      ideas.push({
        query: `${pName} ${k}`,
        adIdea: `"${k}" — ${sentiment.positive}명의 사용자가 인정한 강점을 검색 광고 헤드라인에 활용`,
      });
    }
    for (const p of pain) {
      ideas.push({
        query: `${pName} ${p} 문제`,
        adIdea: `"${p}" 검색 시 → 해소형 카피로 전환: "걱정과 달리..." 메시지 노출`,
      });
    }
    return ideas.slice(0, 5);
  }, [pName, sentiment]);

  return (
    <div className="gradient-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold font-heading text-foreground tracking-tight">
            Marketing Asset Studio
          </h2>
          <Badge variant="secondary" className="text-[10px] ml-2">
            {totalReviews}건 리뷰 기반
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {pName}의 실제 리뷰 기반 — 목적별 채널 카피를 바로 생성합니다.
        </p>
      </div>

      <div className="p-6 space-y-6">

        {/* ═══ 1. 퍼널 목표 설정 ═══ */}
        <div>
          <SectionHeader title="🎯 광고 목적 (퍼널 단계)" subtitle="캠페인 목적에 맞는 채널과 메시지를 자동 매핑합니다" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {AD_FUNNELS.map(f => {
              const isActive = selectedFunnel === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setSelectedFunnel(f.key)}
                  className={`relative p-3.5 rounded-xl border-2 text-left transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={isActive ? "text-primary" : "text-muted-foreground"}>{f.icon}</span>
                    <span className={`text-xs font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
                      {f.labelKo}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{f.descKo}</p>
                  {isActive && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ 2. 채널별 마케팅 카피 ═══ */}
        <div>
          <SectionHeader
            title={`📡 ${activeFunnel.labelKo} — 채널별 카피`}
            subtitle={`메시지 핵심: ${activeFunnel.messageCore}`}
          />
          <div className="space-y-3">
            {channelCopies.map((cc, i) => {
              const fullText = `[${cc.channel}]\nHeadline (${cc.limits.headline}ch): ${cc.headline}\nBody (${cc.limits.body}ch): ${cc.body}\nCTA (${cc.limits.cta}ch): ${cc.cta}`;
              const key = `ch-${selectedFunnel}-${i}`;
              const hLen = cc.headline.length;
              const bLen = cc.body.length;
              const cLen = cc.cta.length;
              return (
                <div key={key} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                        {cc.channel}
                      </Badge>
                      {cc.compliance.ok ? (
                        <Badge variant="outline" className="text-[9px] gap-0.5 border-[#006600]/30 text-[#006600]">
                          <ShieldCheck className="h-3 w-3" /> Compliant
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] gap-0.5 border-amber-500/30 text-amber-600">
                          <AlertTriangle className="h-3 w-3" /> {cc.compliance.issues.length} fix applied
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => copyText(fullText, key)}
                    >
                      {copiedKey === key ? <Check className="h-3 w-3 text-[#006600]" /> : <Copy className="h-3 w-3" />}
                      {copiedKey === key ? "복사됨" : "전체 복사"}
                    </Button>
                  </div>

                  {/* Headline */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[9px] text-muted-foreground mb-0.5">
                        Headline · <span className={hLen > cc.limits.headline ? "text-destructive font-bold" : "text-[#006600]"}>{hLen}/{cc.limits.headline}ch</span>
                      </p>
                      <p className="text-sm font-bold text-foreground">{cc.headline}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 text-[9px] shrink-0" onClick={() => copyText(cc.headline, `${key}-h`)}>
                      {copiedKey === `${key}-h` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>

                  {/* Body */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[9px] text-muted-foreground mb-0.5">
                        Body · <span className={bLen > cc.limits.body ? "text-destructive font-bold" : "text-[#006600]"}>{bLen}/{cc.limits.body}ch</span>
                      </p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{cc.body}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 text-[9px] shrink-0" onClick={() => copyText(cc.body, `${key}-b`)}>
                      {copiedKey === `${key}-b` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">
                        CTA · <span className={cLen > cc.limits.cta ? "text-destructive font-bold" : "text-[#006600]"}>{cLen}/{cc.limits.cta}ch</span>
                      </p>
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                        {cc.cta}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 text-[9px] shrink-0" onClick={() => copyText(cc.cta, `${key}-c`)}>
                      {copiedKey === `${key}-c` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ═══ 3. FAQ ═══ */}
        <Collapsible open={openSections.faq} onOpenChange={() => toggleSection("faq")}>
          <CollapsibleTrigger className="w-full">
            <SectionHeader title="❓ AI FAQ 생성" subtitle="리뷰 기반 FAQ 자동 생성 · 고객 불안 해소 콘텐츠" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <FaqToolkitPanel
              productName={productName}
              displayName={displayName}
              sentiment={sentiment}
              reviews={reviews}
              locale="en-US"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* ═══ 4. CRM Segment & Retargeting Insights ═══ */}
        {marketing.crmInsights && (
          <Collapsible open={openSections.crm} onOpenChange={() => toggleSection("crm")}>
            <CollapsibleTrigger className="w-full">
              <SectionHeader title="📞 리타겟팅 · CRM 세그먼트 인사이트" subtitle="리뷰 기반 CRM 대응 전략과 세그먼트 아이디어" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                  <p className="text-[10px] font-semibold text-rose-600 mb-1">⚡ 기대 괴리</p>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{marketing.crmInsights.expectationGap}</p>
                </div>
                <div className="p-3 rounded-lg border border-amber-600/20 bg-amber-600/5">
                  <p className="text-[10px] font-semibold text-amber-700 mb-1">💰 서비스 기회</p>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{marketing.crmInsights.serviceOpportunity}</p>
                </div>
                <div className="p-3 rounded-lg border border-sky-500/20 bg-sky-500/5">
                  <p className="text-[10px] font-semibold text-sky-600 mb-1">🤝 CRM 대응</p>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{marketing.crmInsights.crmResponse}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ═══ 5. 검색의도 기반 광고 아이디어 ═══ */}
        {searchIntentIdeas.length > 0 && (
          <div>
            <SectionHeader title="🔍 검색의도 기반 광고 아이디어" subtitle="리뷰 키워드에서 추출한 검색 광고 기회" />
            <div className="space-y-2">
              {searchIntentIdeas.map((idea, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                  <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary mt-0.5">
                    🔎 {idea.query}
                  </Badge>
                  <p className="text-xs text-foreground/80 leading-relaxed flex-1">{idea.adIdea}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] shrink-0"
                    onClick={() => copyText(`${idea.query}\n${idea.adIdea}`, `si-${i}`)}
                  >
                    {copiedKey === `si-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tagline */}
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs font-medium text-foreground/90">{marketing.tagline}</p>
        </div>
      </div>
    </div>
  );
}
