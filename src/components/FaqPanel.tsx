import { useMemo } from "react";
import type { SentimentResult } from "@/lib/sentiment";
import { generateMarketerToolkit } from "@/lib/marketerToolkit";
import { toPRName } from "@/lib/formatMessage";
import { useLang } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, HelpCircle, FileText } from "lucide-react";

interface FaqPanelProps {
  productName: string;
  displayName: string;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string }[];
}

export function FaqPanel({ productName, displayName, sentiment, reviews }: FaqPanelProps) {
  const { t } = useLang();

  const data = useMemo(
    () => generateMarketerToolkit(toPRName(displayName || productName), sentiment, reviews),
    [productName, displayName, sentiment, reviews]
  );

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("Copied!", "복사됨!"));
  };

  if (reviews.length < 3) return null;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold font-heading">
            {t("Auto-Generated FAQ", "자동 생성 FAQ")}
          </h3>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
            {data.faqItems.length} {t("Items", "항목")}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyText(data.faqItems.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"))}
          className="h-7 text-[10px] gap-1 text-muted-foreground"
        >
          <Copy className="h-3 w-3" /> {t("Copy All", "전체 복사")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          "Top questions from reviews — ready for blog, IG, or YouTube script",
          "리뷰에서 추출한 반복 질문 TOP N — 블로그·인스타·유튜브 스크립트용"
        )}
      </p>
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
    </div>
  );
}
