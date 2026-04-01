import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { maskCompetitorNames } from "@/lib/sentiment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tv, Refrigerator, WashingMachine, Smartphone, Speaker,
  ChevronDown, ChevronUp, Monitor, Wind, CookingPot, Sparkles, Fan,
  ThumbsUp, ThumbsDown, LayoutGrid
} from "lucide-react";

type CategoryKey =
  | "tv"
  | "refrigerator"
  | "washer"
  | "dryer"
  | "dishwasher"
  | "vacuum"
  | "air_purifier"
  | "oven"
  | "audio"
  | "monitor";

interface CategoryDef {
  key: CategoryKey;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  keywords: string[];
  dbCategory?: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "tv",
    label: "TV",
    subLabel: "OLED · 극초대형 · 라이프스타일 통합",
    icon: Tv,
    keywords: ["oled", "c4", "c5", "c6", "g4", "g5", "g6", "m4", "m5", "evo", "85", "86", "90", "97", "98", "qned", "nano", "large", "big", "stanby", "standby", "stanbyme", "objet", "easel", "lifestyle", "art", "posé", "pose", "tv", "television"],
  },
  {
    key: "refrigerator",
    label: "냉장고",
    subLabel: "InstaView · 김치냉장고",
    icon: Refrigerator,
    keywords: ["fridge", "refrigerator", "instaview", "freezer", "kimchi", "ice"],
  },
  {
    key: "washer",
    label: "세탁기",
    subLabel: "WashTower · AI DD",
    icon: WashingMachine,
    keywords: ["washer", "washing", "washtower", "laundry", "wash"],
  },
  {
    key: "dryer",
    label: "건조기",
    subLabel: "히트펌프 · 듀얼인버터",
    icon: WashingMachine,
    keywords: ["dryer", "dry", "heat pump", "ventless"],
  },
  {
    key: "dishwasher",
    label: "식기세척기",
    subLabel: "QuadWash · TrueSteam",
    icon: Sparkles,
    keywords: ["dishwasher", "dish", "quadwash", "truesteam"],
  },
  {
    key: "vacuum",
    label: "청소기",
    subLabel: "CordZero · All-in-One Tower",
    icon: Wind,
    keywords: ["vacuum", "cordzero", "cord zero", "cordless", "robot vacuum", "stick vacuum", "all-in-one tower", "a9", "r9"],
  },
  {
    key: "air_purifier",
    label: "공기청정기",
    subLabel: "PuriCare · 에어로타워",
    icon: Fan,
    keywords: ["air purifier", "puricare", "purifier", "aerotower", "aero tower", "air quality", "hepa", "dehumidifier"],
  },
  {
    key: "oven",
    label: "오븐 · 레인지",
    subLabel: "InstaView · ProBake · 전자레인지",
    icon: CookingPot,
    keywords: ["oven", "range", "microwave", "probake", "convection", "stove", "cooktop", "induction"],
  },
  {
    key: "audio",
    label: "사운드바 · 오디오",
    subLabel: "Soundbar · XBOOM",
    icon: Speaker,
    keywords: ["soundbar", "sound bar", "xboom", "speaker", "audio", "subwoofer"],
  },
  {
    key: "monitor",
    label: "모니터",
    subLabel: "UltraGear · UltraWide",
    icon: Monitor,
    keywords: ["monitor", "ultragear", "ultrawide", "gaming monitor"],
  },
];

function classifyToCategory(text: string): CategoryKey | null {
  const lower = text.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.key;
  }
  return null;
}

export function RedditCategoryAnalysis() {
  const [expanded, setExpanded] = useState<CategoryKey | null>(null);

  const { data: reviews } = useQuery({
    queryKey: ["reddit-category-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("content, sentiment, title, product_id, author")
        .like("source", "reddit%")
        .limit(800);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000 * 5,
  });

  const categorized = useMemo(() => {
    if (!reviews) return null;

    const result: Record<
      CategoryKey,
      {
        total: number;
        positive: number;
        negative: number;
        posSnippets: string[];
        negSnippets: string[];
      }
    > = {} as any;

    CATEGORIES.forEach((c) => {
      result[c.key] = { total: 0, positive: 0, negative: 0, posSnippets: [], negSnippets: [] };
    });

    reviews.forEach((r) => {
      const combined = `${r.title || ""} ${r.content}`;
      const cat = classifyToCategory(combined);
      if (!cat) return;
      result[cat].total++;
      if (r.sentiment === "positive") {
        result[cat].positive++;
        if (result[cat].posSnippets.length < 5) result[cat].posSnippets.push(r.content.slice(0, 150));
      } else if (r.sentiment === "negative") {
        result[cat].negative++;
        if (result[cat].negSnippets.length < 5) result[cat].negSnippets.push(r.content.slice(0, 150));
      }
    });

    return result;
  }, [reviews]);

  const toggle = (key: CategoryKey) => setExpanded(expanded === key ? null : key);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">제품군별 Reddit VOC 분석</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Reddit에서 언급된 LG 제품을 카테고리별로 분류하여 긍/부정 의견을 요약합니다.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {CATEGORIES.map((cat) => {
            const stats = categorized?.[cat.key];
            const hasData = stats && stats.total > 0;
            const isOpen = expanded === cat.key;
            const Icon = cat.icon;

            return (
              <div key={cat.key} className="rounded-lg border border-border overflow-hidden">
                {/* Category Row */}
                <button
                  onClick={() => hasData && toggle(cat.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    hasData ? "hover:bg-secondary/40 cursor-pointer" : "opacity-50 cursor-default"
                  } ${isOpen ? "bg-secondary/30" : ""}`}
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{cat.label}</span>
                      <span className="text-[10px] text-muted-foreground">{cat.subLabel}</span>
                    </div>
                  </div>
                  {hasData && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {stats.total}건
                      </Badge>
                      <span className="text-[10px] text-emerald-500 font-medium">
                        +{stats.positive}
                      </span>
                      <span className="text-[10px] text-destructive font-medium">
                        -{stats.negative}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  {!hasData && (
                    <span className="text-[10px] text-muted-foreground">데이터 없음</span>
                  )}
                </button>

                {/* Expanded Detail */}
                {isOpen && hasData && (
                  <div className="px-3 pb-3 border-t border-border bg-secondary/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {/* Positive */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-600">
                            긍정 의견 ({stats.positive}건)
                          </span>
                        </div>
                        <ScrollArea className="max-h-[180px]">
                          <div className="space-y-1.5">
                            {stats.posSnippets.length > 0 ? (
                              stats.posSnippets.map((s, i) => (
                                <div
                                  key={i}
                                  className="text-[11px] text-foreground/80 leading-relaxed p-2 rounded bg-emerald-500/5 border border-emerald-500/10"
                                >
                                  "{s}…"
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-muted-foreground">긍정 리뷰 없음</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Negative */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-xs font-semibold text-destructive">
                            부정 의견 ({stats.negative}건)
                          </span>
                        </div>
                        <ScrollArea className="max-h-[180px]">
                          <div className="space-y-1.5">
                            {stats.negSnippets.length > 0 ? (
                              stats.negSnippets.map((s, i) => (
                                <div
                                  key={i}
                                  className="text-[11px] text-foreground/80 leading-relaxed p-2 rounded bg-destructive/5 border border-destructive/10"
                                >
                                  "{s}…"
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-muted-foreground">부정 리뷰 없음</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
