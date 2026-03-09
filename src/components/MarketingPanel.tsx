import type { MarketingOutput } from "@/lib/formatMessage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText, Sparkles } from "lucide-react";

interface MarketingPanelProps {
  marketing: MarketingOutput;
}

export function MarketingPanel({ marketing }: MarketingPanelProps) {
  return (
    <div className="gradient-card rounded-xl border border-border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold font-heading">마케팅 메시지 변환</h3>
        <p className="text-2xl font-bold mt-2 text-gradient">{marketing.tagline}</p>
      </div>

      <Tabs defaultValue="qa" className="w-full">
        <TabsList className="bg-secondary border border-border w-full">
          <TabsTrigger value="qa" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <MessageSquare className="h-4 w-4 mr-2" />Q&A
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <FileText className="h-4 w-4 mr-2" />리뷰 가이드
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Sparkles className="h-4 w-4 mr-2" />요약
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qa" className="mt-4 space-y-4">
          {marketing.qaList.map((qa, i) => (
            <div key={i} className="p-4 bg-secondary/50 rounded-lg border border-border">
              <p className="font-semibold text-primary mb-2">Q: {qa.question}</p>
              <p className="text-sm text-foreground/90 leading-relaxed">A: {qa.answer}</p>
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
            <h4 className="font-semibold text-success mb-1">🟢 강점</h4>
            <p className="text-sm">{marketing.strengthsSummary}</p>
          </div>
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-1">🔴 개선점</h4>
            <p className="text-sm">{marketing.weaknessesSummary}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
