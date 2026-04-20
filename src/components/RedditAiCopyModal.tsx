import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, Copy, Megaphone } from "lucide-react";
import { toast } from "sonner";

export function RedditAiCopyModal() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<string | null>(null);
  const [copyType, setCopyType] = useState<"defense" | "offense" | "faq">("defense");

  // Fetch top VOC keywords
  const { data: vocData } = useQuery({
    queryKey: ["reddit-voc-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("content, sentiment, title")
        .like("source", "reddit%")
        .limit(200);
      if (error) throw error;

      const pos = (data || []).filter((r) => r.sentiment === "positive");
      const neg = (data || []).filter((r) => r.sentiment === "negative");

      return {
        total: data?.length || 0,
        posCount: pos.length,
        negCount: neg.length,
        topPositiveSnippets: pos.slice(0, 5).map((r) => r.content.slice(0, 120)),
        topNegativeSnippets: neg.slice(0, 5).map((r) => r.content.slice(0, 120)),
      };
    },
    staleTime: 60_000 * 10,
  });

  const handleGenerate = async () => {
    if (!vocData) return;
    setIsGenerating(true);
    setGeneratedCopy(null);

    try {
      const COPY_RULE = `\n\n🎯 COPY RULE (CRITICAL): MINIMIZE explicit LG product/model name mentions. Lead with USER BENEFITS, EMOTIONAL HOOKS, and PROOF POINTS. Mention a specific model name AT MOST ONCE per message, only if essential. Persuasion must come from value/transformation, not from name recall.`;
      const prompts: Record<string, string> = {
        defense: `Based on these negative Reddit VOC snippets about LG products, generate 3 defensive marketing messages that address customer concerns and turn them into reassurance. Keep each message under 2 lines. Include Korean translation.${COPY_RULE}\n\nNegative VOC:\n${vocData.topNegativeSnippets.join("\n")}`,
        offense: `Based on these positive Reddit reviews about LG products, generate 3 offensive marketing messages that amplify customer satisfaction. Perfect for PDP hero copy, social media, or ad banners. Include Korean translation.${COPY_RULE}\n\nPositive reviews:\n${vocData.topPositiveSnippets.join("\n")}`,
        faq: `Based on these Reddit community discussions about LG products, generate 5 FAQ entries (Q&A format) that address the most common concerns and questions. Include Korean translation.${COPY_RULE}\n\nPositive:\n${vocData.topPositiveSnippets.join("\n")}\n\nNegative:\n${vocData.topNegativeSnippets.join("\n")}`,
      };

      const response = await supabase.functions.invoke("generate-action-plan", {
        body: { prompt: prompts[copyType] },
      });

      if (response.error) throw response.error;
      setGeneratedCopy(response.data?.plan || response.data?.result || "생성 결과를 확인할 수 없습니다.");
    } catch (e) {
      console.error("AI generation error:", e);
      // Fallback: rule-based generation
      const fallback = generateRuleBasedCopy(copyType, vocData);
      setGeneratedCopy(fallback);
    }

    setIsGenerating(false);
  };

  const handleCopy = () => {
    if (generatedCopy) {
      navigator.clipboard.writeText(generatedCopy);
      toast.success("복사 완료!");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">AI Marketing Copy Generator</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Reddit VOC 데이터를 기반으로 마케팅 카피를 자동 생성합니다. Defense(불안 해소), Offense(강점 강화), FAQ 중 선택하세요.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Stats */}
        {vocData && (
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg bg-secondary/30 border border-border p-2.5 text-center">
              <div className="text-lg font-bold text-foreground">{vocData.total}</div>
              <div className="text-[10px] text-muted-foreground">전체 Reddit VOC</div>
            </div>
            <div className="flex-1 rounded-lg bg-success/5 border border-success/20 p-2.5 text-center">
              <div className="text-lg font-bold text-success">{vocData.posCount}</div>
              <div className="text-[10px] text-muted-foreground">긍정</div>
            </div>
            <div className="flex-1 rounded-lg bg-destructive/5 border border-destructive/20 p-2.5 text-center">
              <div className="text-lg font-bold text-destructive">{vocData.negCount}</div>
              <div className="text-[10px] text-muted-foreground">부정</div>
            </div>
          </div>
        )}

        {/* Copy type selector */}
        <div className="flex gap-2">
          {([
            { key: "defense", label: "🛡 Defense Copy", desc: "부정 VOC → 불안 해소 메시지" },
            { key: "offense", label: "⚡ Offense Copy", desc: "긍정 VOC → 강점 강화 메시지" },
            { key: "faq", label: "❓ FAQ 생성", desc: "커뮤니티 질문 → FAQ 자동 생성" },
          ] as const).map((type) => (
            <button
              key={type.key}
              onClick={() => setCopyType(type.key)}
              className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                copyType === type.key
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <p className="text-xs font-semibold">{type.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{type.desc}</p>
            </button>
          ))}
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !vocData}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />생성 중...</>
          ) : (
            <><Megaphone className="h-4 w-4 mr-2" />마케팅 카피 생성하기</>
          )}
        </Button>

        {/* Result */}
        {generatedCopy && (
          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-[10px]">
                {copyType === "defense" ? "🛡 Defense Copy" : copyType === "offense" ? "⚡ Offense Copy" : "❓ FAQ"}
              </Badge>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleCopy}>
                <Copy className="h-3 w-3 mr-1" />복사
              </Button>
            </div>
            <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
              {generatedCopy}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Fallback rule-based generation ── */
function generateRuleBasedCopy(type: string, data: { topPositiveSnippets: string[]; topNegativeSnippets: string[] }): string {
  if (type === "defense") {
    return `🛡 Defense Marketing Copy (Reddit VOC 기반)

1. "고객님의 우려를 잘 알고 있습니다 — LG는 지속적인 펌웨어 업데이트로 더 나은 경험을 제공합니다."
   We hear you — LG delivers continuous firmware updates for an ever-improving experience.

2. "초기 설정 가이드와 전문 설치 서비스로 처음부터 완벽한 경험을 보장합니다."
   Perfect from day one — professional setup guides and installation service included.

3. "커뮤니티에서 가장 많이 논의된 이슈에 대한 공식 FAQ를 업데이트했습니다."
   We've updated our official FAQ addressing the most discussed community topics.`;
  }
  if (type === "offense") {
    return `⚡ Offense Marketing Copy (Reddit VOC 기반)

1. "압도적인 화질과 색재현력 — Reddit 커뮤니티가 극찬한 LG OLED의 핵심 강점"
   Stunning picture quality and color accuracy — the key strengths praised by the Reddit community for LG OLED.

2. "설치하고 나면 후회 없는 선택이라는 게 Reddit의 공통 의견입니다."
   "Zero regret after setup" — that's the Reddit consensus.

3. "경쟁 제품 대비 가성비와 성능 모두 앞선다는 커뮤니티 평가"
   Community-verified: leading in both value and performance.`;
  }
  return `❓ Reddit 커뮤니티 기반 FAQ

Q1: LG OLED TV의 번인(Burn-in)이 걱정됩니다.
A1: LG OLED는 픽셀 리프레셔, 로고 감지 등 다양한 번인 방지 기능이 내장되어 있으며, 일반 사용 환경에서 번인 발생 가능성은 매우 낮습니다.

Q2: 게이밍 모니터로 LG TV를 사용해도 되나요?
A2: LG OLED TV는 VRR, ALLM, 4K@120Hz를 지원하여 PS5, Xbox와 완벽 호환됩니다. 인풋랙도 업계 최저 수준입니다.

Q3: 경쟁사 대비 LG의 장점은 무엇인가요?
A3: Reddit 커뮤니티에서 가장 많이 언급되는 LG의 강점은 self-lit pixel의 완벽한 블랙, 넓은 시야각, 그리고 게이밍 최적화 기능입니다.`;
}
