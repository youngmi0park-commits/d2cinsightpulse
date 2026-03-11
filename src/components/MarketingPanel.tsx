import { useState } from "react";
import type { MarketingOutput } from "@/lib/formatMessage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText, Sparkles, Copy, Pencil, Check, Plus, Trash2 } from "lucide-react";
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

  return (
    <div className="gradient-card rounded-xl border border-border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold font-heading">{t("Marketing Message Conversion", "마케팅 메시지 변환")}</h3>
        <p className="text-2xl font-bold mt-2 text-gradient">{marketing.tagline}</p>
      </div>

      <Tabs defaultValue="qa" className="w-full">
        <TabsList className="bg-secondary border border-border w-full">
          <TabsTrigger value="qa" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <MessageSquare className="h-4 w-4 mr-2" />{t("Homepage FAQ", "홈페이지 FAQ")}
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <FileText className="h-4 w-4 mr-2" />{t("Review Guide", "리뷰 가이드")}
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Sparkles className="h-4 w-4 mr-2" />{t("Summary", "요약")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qa" className="mt-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              {t(
                "Edit customer questions & tips into FAQ format for your homepage.",
                "고객 질문 및 사용팁을 홈페이지용 FAQ 형식으로 편집하세요."
              )}
            </p>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => toggleEdit(i)}
                >
                  {qa.isEditing ? <Check className="h-3.5 w-3.5 text-success" /> : <Pencil className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteQA(i)}
                >
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
        </TabsContent>

        <TabsContent value="guide" className="mt-4">
          <pre className="p-4 bg-secondary/50 rounded-lg border border-border text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {marketing.reviewGuide}
          </pre>
        </TabsContent>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <div className="p-4 bg-success/10 rounded-lg border border-success/20">
            <h4 className="font-semibold text-success mb-1">🟢 {t("Strengths", "강점")}</h4>
            <p className="text-sm">{marketing.strengthsSummary}</p>
          </div>
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-1">🔴 {t("Improvements", "개선점")}</h4>
            <p className="text-sm">{marketing.weaknessesSummary}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
