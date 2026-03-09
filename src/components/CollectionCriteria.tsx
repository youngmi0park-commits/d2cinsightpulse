import { Database, Globe, Calendar, Filter, MessageSquare, ShieldCheck, Languages, Tag, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const criteria = [
  // ... keep existing code
];

export const CollectionCriteria = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full gradient-card rounded-xl border border-border p-4 md:p-5 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold font-heading">📋 데이터 수집 기준</h3>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="gradient-card rounded-b-xl border border-t-0 border-border p-6 md:p-8">
          <p className="text-sm text-muted-foreground mb-6">
            본 대시보드는 아래 기준에 따라 수집된 데이터를 기반으로 감성 분석 및 마케팅 인사이트를 제공합니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {criteria.map(({ icon: Icon, title, items }) => (
              <div key={title} className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <h4 className="font-semibold font-heading text-sm">{title}</h4>
                </div>
                <ul className="space-y-1.5">
                  {items.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
