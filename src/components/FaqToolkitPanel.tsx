import { useState } from "react";
import { FaqPanel } from "@/components/FaqPanel";
import { MarketerToolkit } from "@/components/MarketerToolkit";
import { useLang } from "@/contexts/LanguageContext";
import { HelpCircle, Rocket } from "lucide-react";
import type { SentimentResult } from "@/lib/sentiment";

interface FaqToolkitPanelProps {
  productName: string;
  displayName: string;
  sentiment: SentimentResult;
  reviews: { text: string; sentiment?: string; source?: string }[];
  locale?: string;
}

export function FaqToolkitPanel({ productName, displayName, sentiment, reviews, locale }: FaqToolkitPanelProps) {
  const { t } = useLang();
  const [activeSection, setActiveSection] = useState<"faq" | "toolkit">("faq");

  return (
    <div>
      {/* Sub-tab toggle */}
      <div className="px-5 pt-4 pb-0">
        <div className="flex gap-2 p-1 bg-secondary/30 rounded-lg border border-border">
          <button
            onClick={() => setActiveSection("faq")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              activeSection === "faq"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {t("AI FAQ", "AI FAQ")}
          </button>
          <button
            onClick={() => setActiveSection("toolkit")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              activeSection === "toolkit"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Rocket className="h-3.5 w-3.5" />
            {t("Marketing Asset Studio", "마케팅 에셋 스튜디오")}
          </button>
        </div>
      </div>

      {activeSection === "faq" ? (
        <FaqPanel
          productName={productName}
          displayName={displayName}
          sentiment={sentiment}
          reviews={reviews}
          locale={locale}
        />
      ) : (
        <MarketerToolkit
          productName={productName}
          displayName={displayName}
          sentiment={sentiment}
          reviews={reviews}
        />
      )}
    </div>
  );
}
