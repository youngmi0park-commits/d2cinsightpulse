import { useMemo } from "react";
import type { SentimentResult } from "@/lib/sentiment";
import { generateMarketerToolkit } from "@/lib/marketerToolkit";
import { toPRName } from "@/lib/formatMessage";
import { useLang } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Copy, Rocket,
  MessageSquareQuote, Puzzle, Search, Users, Sparkles,
  HelpCircle, AlertTriangle, Target, Mail, Video, FileText,
} from "lucide-react";

interface Props {
  productName: string;
  displayName: string;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string }[];
}

const TAG_COLORS: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  negative: "bg-red-500/10 text-red-400 border-red-500/20",
  confusion: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  expectation: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const TAG_LABELS: Record<string, string> = {
  positive: "Positive",
  negative: "Negative",
  confusion: "Confusion",
  expectation: "Expectation",
};

const INTENT_COLORS: Record<string, string> = {
  problem_aware: "bg-red-500/10 text-red-400 border-red-500/20",
  info_seeking: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  comparison: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  purchase: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export function MarketerToolkit({ productName, displayName, sentiment, reviews }: Props) {
  const { t } = useLang();
  

  const data = useMemo(
    () => generateMarketerToolkit(toPRName(displayName || productName), sentiment, reviews),
    [productName, displayName, sentiment, reviews]
  );

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("Copied!", "복사됨!"));
  };

  const copySection = (title: string, content: string) => {
    copyText(`[${title}]\n${content}`);
  };

  if (reviews.length < 3) return null;

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2.5 mb-1">
        <Rocket className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold font-heading">
          {t("Marketer's Actionable Toolkit", "마케터 실행 툴킷")}
        </h3>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
          7 {t("Tools", "항목")}
        </Badge>
      </div>
            <p className="text-sm text-muted-foreground">
              {t(
                "Ready-to-use marketing sources extracted from real customer reviews — copy, templates, ad ideas, segments, and more.",
                "실제 고객 리뷰에서 추출한 즉시 활용 가능한 마케팅 소스 — 카피, 템플릿, 광고 아이디어, 세그먼트 등."
              )}
            </p>

            {/* ① & ② moved to Channel Marketing Copy → Outside Channel */}


            {/* ③ Search Intent Ad Ideas */}
            <ToolkitSection
              icon={<Search className="h-4 w-4" />}
              number="③"
              title={t("Search Intent Ad Ideas", "검색 의도 기반 광고 아이디어")}
              subtitle={t("Ad concepts mapped to customer search behavior", "고객 검색 행동에 매핑된 광고 컨셉")}
              onCopy={() => copySection("Search Intent Ads", data.searchIntentAds.map(a => `[${a.intentLabel}] ${a.keyword} → ${a.adIdea}`).join("\n"))}
            >
              <div className="grid gap-2">
                {data.searchIntentAds.map((ad, i) => (
                  <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3 border border-border/50 group">
                    <Badge variant="outline" className={`text-[10px] shrink-0 mt-0.5 ${INTENT_COLORS[ad.intent]}`}>
                      {ad.intentLabel}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/90">{ad.keyword}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ad.adIdea}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 shrink-0"
                      onClick={() => copyText(`${ad.keyword}: ${ad.adIdea}`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ToolkitSection>

            {/* ④ CRM Segment Insights */}
            <ToolkitSection
              icon={<Users className="h-4 w-4" />}
              number="④"
              title={t("Retargeting & CRM Segment Insights", "리타겟팅 & CRM 세그먼트 인사이트")}
              subtitle={t("Behavior-based segments with message, channel, and offer recommendations", "행동 기반 세그먼트별 메시지·채널·오퍼 추천")}
              onCopy={() => copySection("CRM Segments", data.crmSegments.map(s => `[${s.name}]\n${s.description}\nMessage: ${s.message}\nChannel: ${s.channel}\nOffer: ${s.offer}`).join("\n\n"))}
            >
              <div className="grid gap-3">
                {data.crmSegments.map((seg, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border/50 space-y-2 group relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                      onClick={() => copyText(`[${seg.name}]\n${seg.description}\nMessage: ${seg.message}\nChannel: ${seg.channel}\nOffer: ${seg.offer}`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-semibold text-foreground/90">{seg.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{seg.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                      <div className="bg-background/50 rounded p-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          <Mail className="h-3 w-3 inline mr-1" />{t("Message", "메시지")}
                        </p>
                        <p className="text-xs text-foreground/80">{seg.message}</p>
                      </div>
                      <div className="bg-background/50 rounded p-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          {t("Channel", "채널")}
                        </p>
                        <p className="text-xs text-foreground/80">{seg.channel}</p>
                      </div>
                      <div className="bg-background/50 rounded p-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          {t("Offer", "오퍼")}
                        </p>
                        <p className="text-xs text-foreground/80">{seg.offer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ToolkitSection>

            {/* ⑤ Content Ideas */}
            <ToolkitSection
              icon={<Sparkles className="h-4 w-4" />}
              number="⑤"
              title={t("Content Material from Customers", "고객 발 콘텐츠 소재")}
              subtitle={t("Reels, card news, blog topics from real expressions", "실제 표현에서 추출한 릴스·카드뉴스·블로그 주제")}
              onCopy={() => copySection("Content Ideas", data.contentIdeas.map(c => `[${c.contentType}] ${c.expression} → ${c.title}`).join("\n"))}
            >
              {data.contentIdeas.length === 0 ? (
                <EmptyState text={t("Not enough data for content suggestions.", "콘텐츠 제안을 위한 데이터가 부족합니다.")} />
              ) : (
                <div className="grid gap-2">
                  {data.contentIdeas.map((idea, i) => (
                    <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3 border border-border/50 group">
                      <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5 border-primary/30 text-primary">
                        <Video className="h-3 w-3 mr-1" />
                        {idea.contentType}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">"{idea.expression}"</p>
                        <p className="text-sm font-medium text-foreground/90 mt-0.5">→ {idea.title}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 shrink-0"
                        onClick={() => copyText(idea.title)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ToolkitSection>

            {/* ⑥ FAQ Auto-generation */}
            <ToolkitSection
              icon={<HelpCircle className="h-4 w-4" />}
              number="⑥"
              title={t("Auto-Generated FAQ", "자동 생성 FAQ")}
              subtitle={t("Top questions from reviews — ready for blog, IG, or YouTube script", "리뷰에서 추출한 반복 질문 TOP N — 블로그·인스타·유튜브 스크립트용")}
              onCopy={() => copySection("FAQ", data.faqItems.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"))}
            >
              <div className="grid gap-3">
                {data.faqItems.map((faq, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border/50 group relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                      onClick={() => copyText(`Q: ${faq.question}\nA: ${faq.answer}`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <p className="text-sm font-semibold text-foreground/90">Q: {faq.question}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-5">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </ToolkitSection>

            {/* ⑦ Improvement Points */}
            <ToolkitSection
              icon={<AlertTriangle className="h-4 w-4" />}
              number="⑦"
              title={t("Customer Improvement Points", "고객이 말하는 개선 포인트")}
              subtitle={t("Categorized improvement areas — shareable insight cards for product teams", "제품팀과 공유 가능한 카테고리별 개선 인사이트 카드")}
              onCopy={() => copySection("Improvement Points", data.improvementPoints.map(p => `[${p.severity.toUpperCase()}] ${p.category}: ${p.point} (${p.mentions} mentions)`).join("\n"))}
            >
              {data.improvementPoints.length === 0 ? (
                <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20 text-center">
                  <p className="text-sm text-emerald-400">
                    {t("No significant improvement points found — customers are largely satisfied!", "주요 개선점이 발견되지 않음 — 고객 만족도가 높습니다!")}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {data.improvementPoints.map((point, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 border border-border/50">
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${SEVERITY_COLORS[point.severity]}`}>
                        {point.severity.toUpperCase()}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-muted-foreground">{point.category}</span>
                        <p className="text-sm text-foreground/90">{point.point}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{point.mentions} {t("mentions", "건")}</span>
                    </div>
                  ))}
                </div>
              )}
            </ToolkitSection>
    </div>
  );
}

// ─── Sub-components ───

function ToolkitSection({
  icon,
  number,
  title,
  subtitle,
  onCopy,
  children,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  subtitle: string;
  onCopy: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <span className="text-xs text-muted-foreground font-mono">{number}</span>
          <h4 className="text-sm font-semibold text-foreground/90">{title}</h4>
        </div>
        <Button variant="ghost" size="sm" onClick={onCopy} className="h-7 text-[10px] gap-1 text-muted-foreground">
          <Copy className="h-3 w-3" /> Copy
        </Button>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">{subtitle}</p>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-muted/20 rounded-lg p-4 border border-border/30 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
