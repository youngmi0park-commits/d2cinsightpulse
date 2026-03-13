import { useState } from "react";
import type { MarketingOutput } from "@/lib/formatMessage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText, Sparkles, Copy, Pencil, Check, Plus, Trash2, Lightbulb, Shield, Building2, Megaphone } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface MarketingPanelProps {
  marketing: MarketingOutput;
}

interface EditableQA {
  question: string;
  answer: string;
  isEditing: boolean;
}

export function MarketingPanel({ marketing }: MarketingPanelProps) {
  const { t } = useLang();
  const [qaItems, setQaItems] = useState<EditableQA[]>(
    marketing.qaList.map((qa) => ({ ...qa, isEditing: false }))
  );

  const toggleEdit = (index: number) => {
    setQaItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isEditing: !item.isEditing } : item))
    );
  };

  const updateQA = (index: number, field: "question" | "answer", value: string) => {
    setQaItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const deleteQA = (index: number) => {
    setQaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addQA = () => {
    setQaItems((prev) => [
      ...prev,
      {
        question: t("New question", "새 질문을 입력하세요"),
        answer: t("Answer based on customer feedback", "고객 피드백을 바탕으로 답변을 입력하세요"),
        isEditing: true,
      },
    ]);
  };

  const copyAllQA = () => {
    const text = qaItems
      .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success(t("Copied to clipboard!", "클립보드에 복사되었습니다!"));
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("Copied to clipboard!", "클립보드에 복사되었습니다!"));
  };

  return (
    <div className="gradient-card rounded-xl border border-border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold font-heading">{t("Marketing Message Conversion", "마케팅 메시지 변환")}</h3>
        <p className="text-2xl font-bold mt-2 text-gradient">{marketing.tagline}</p>
      </div>

      <Tabs defaultValue="customer" className="w-full">
        <TabsList className="bg-secondary border border-border w-full h-auto flex-wrap">
          <TabsTrigger value="customer" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="text-xs sm:text-sm">{t("Homepage Customer Marketing", "홈페이지 대고객 마케팅")}</span>
          </TabsTrigger>
          <TabsTrigger value="external" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-1.5">
            <Megaphone className="h-4 w-4" />
            <span className="text-xs sm:text-sm">{t("External Comm. Guide", "대외 커뮤니케이션 가이드")}</span>
          </TabsTrigger>
          <TabsTrigger value="usertips" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-1.5">
            <Lightbulb className="h-4 w-4" />
            <span className="text-xs sm:text-sm">{t("User Tips & Durability", "사용팁 & 내구성")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: 홈페이지 대고객 마케팅 메시지 */}
        <TabsContent value="customer" className="mt-4 space-y-4">
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
            <span className="font-semibold text-primary">{t("Homepage Customer Marketing Messages", "홈페이지 대고객 마케팅 메시지")}</span>
            <span className="ml-2">
              {t(
                "FAQ, product highlights, and customer-facing content for your homepage and dotcom channels.",
                "홈페이지 및 닷컴 채널에 활용할 FAQ, 제품 하이라이트, 고객 대상 콘텐츠입니다."
              )}
            </span>
          </div>

          {/* Strengths / Weaknesses Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1 text-sm">🟢 {t("Strengths", "강점")}</h4>
              <p className="text-sm">{marketing.strengthsSummary}</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <h4 className="font-semibold text-destructive mb-1 text-sm">🔴 {t("Improvements", "개선점")}</h4>
              <p className="text-sm">{marketing.weaknessesSummary}</p>
            </div>
          </div>

          {/* Editable FAQ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-primary" />
                {t("Homepage FAQ", "홈페이지 FAQ")}
              </h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyAllQA} className="text-xs">
                  <Copy className="h-3 w-3 mr-1" />{t("Copy All", "전체 복사")}
                </Button>
                <Button variant="outline" size="sm" onClick={addQA} className="text-xs">
                  <Plus className="h-3 w-3 mr-1" />{t("Add", "추가")}
                </Button>
              </div>
            </div>

            {qaItems.map((qa, i) => (
              <div key={i} className="p-4 bg-secondary/50 rounded-lg border border-border group relative">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleEdit(i)}>
                    {qa.isEditing ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Pencil className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteQA(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {qa.isEditing ? (
                  <div className="space-y-2 pr-16">
                    <Input
                      value={qa.question}
                      onChange={(e) => updateQA(i, "question", e.target.value)}
                      className="font-semibold text-primary text-sm bg-background"
                      placeholder={t("Customer question or topic", "고객 질문 또는 주제")}
                    />
                    <Textarea
                      value={qa.answer}
                      onChange={(e) => updateQA(i, "answer", e.target.value)}
                      className="text-sm bg-background min-h-[80px]"
                      placeholder={t("Answer or tip for homepage", "홈페이지용 답변 또는 팁")}
                    />
                  </div>
                ) : (
                  <div className="pr-16">
                    <p className="font-semibold text-primary mb-2 text-sm">Q: {qa.question}</p>
                    <p className="text-sm text-foreground/90 leading-relaxed">A: {qa.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: 대외 커뮤니케이션 가이드 */}
        <TabsContent value="external" className="mt-4 space-y-4">
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
            <span className="font-semibold text-primary">{t("External Communication Guide", "대외 커뮤니케이션 가이드")}</span>
            <span className="ml-2">
              {t(
                "Review guide, influencer talking points, and external communication materials for reviewers and partners.",
                "리뷰어, 인플루언서, 파트너 대상 리뷰 가이드 및 대외 커뮤니케이션 자료입니다."
              )}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                {t("Review & Communication Guide", "리뷰 & 커뮤니케이션 가이드")}
              </h4>
              <Button variant="outline" size="sm" onClick={() => copyText(marketing.reviewGuide)} className="text-xs">
                <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
              </Button>
            </div>
            <pre className="p-4 bg-secondary/50 rounded-lg border border-border text-sm whitespace-pre-wrap font-mono leading-relaxed">
              {marketing.reviewGuide}
            </pre>
          </div>

          {/* Summary for external use */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1 text-sm">
                🟢 {t("Key Talking Points (Positive)", "핵심 토킹포인트 (긍정)")}
              </h4>
              <p className="text-sm">{marketing.strengthsSummary}</p>
            </div>
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-1 text-sm">
                ⚠️ {t("Points to Address (Honest Response)", "대응 필요 포인트 (솔직한 응대)")}
              </h4>
              <p className="text-sm">{marketing.weaknessesSummary}</p>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: 사용자 팁 & 내구성/사용 의견 */}
        <TabsContent value="usertips" className="mt-4 space-y-5">
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
            <span className="font-semibold text-primary">{t("User Tips & Durability Insights", "사용자 팁 & 내구성 인사이트")}</span>
            <span className="ml-2">
              {t(
                "Practical usage tips and durability/long-term use opinions extracted from real user reviews.",
                "실제 사용자 리뷰에서 추출한 실용적 사용팁과 내구성/장기 사용에 대한 의견입니다."
              )}
            </span>
          </div>

          {/* User Tips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                {t("User Tips & Recommendations", "사용자 팁 & 추천")}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(marketing.userTips.join("\n"))}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
              </Button>
            </div>
            <div className="space-y-2">
              {marketing.userTips.map((tip, i) => (
                <div key={i} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
                  <span className="text-amber-500 font-bold text-sm shrink-0 mt-0.5">💡</span>
                  <p className="text-sm text-foreground/90 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Durability & Usage Insights */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-500" />
                {t("Durability & Long-term Usage", "내구성 & 장기 사용 의견")}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(marketing.durabilityInsights.join("\n"))}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />{t("Copy", "복사")}
              </Button>
            </div>
            <div className="space-y-2">
              {marketing.durabilityInsights.map((insight, i) => (
                <div key={i} className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
                  <span className="text-blue-500 font-bold text-sm shrink-0 mt-0.5">🔧</span>
                  <p className="text-sm text-foreground/90 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
