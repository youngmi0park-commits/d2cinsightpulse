import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RedditBucketDashboard } from "@/components/RedditBucketDashboard";
import { RedditCountryInsights } from "@/components/RedditCountryInsights";
import { RedditVocPostCards } from "@/components/RedditVocPostCards";

import { RedditCompetitorMentions } from "@/components/RedditCompetitorMentions";
import { RedditWeeklySummary } from "@/components/RedditWeeklySummary";
import { RedditCategoryAnalysis } from "@/components/RedditCategoryAnalysis";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/contexts/LanguageContext";

/* ── Reddit subreddit → category grouping ── */
const SUBREDDIT_GROUPS: {
  value: string;
  label: string;
  labelKo: string;
  icon: string;
  subreddits: string[];
}[] = [
  {
    value: "tv",
    label: "TV / OLED",
    labelKo: "TV · OLED",
    icon: "📺",
    subreddits: ["reddit_lgoled", "reddit_r/lgoled", "reddit_oled_gaming", "reddit_r/oled_gaming", "reddit_4ktv", "reddit_oled"],
  },
  {
    value: "appliance",
    label: "Appliances",
    labelKo: "가전",
    icon: "🏠",
    subreddits: ["reddit_appliances", "reddit_appliancerepair", "reddit_ac", "reddit_airconditioners", "reddit_vacuumcleaners", "reddit_buyitforlife", "reddit_homeimprovement"],
  },
  {
    value: "audio",
    label: "Audio / Soundbar",
    labelKo: "사운드바·오디오",
    icon: "🔊",
    subreddits: ["reddit_soundbars"],
  },
  {
    value: "monitor",
    label: "Monitor / PC",
    labelKo: "모니터·PC",
    icon: "🖥️",
    subreddits: ["reddit_monitors", "reddit_ultrawidemasterrace", "reddit_buildapc", "reddit_buildapcsales", "reddit_buildapcmonitors", "reddit_pcgaming", "reddit_nvidia", "reddit_hidpi_monitors"],
  },
  {
    value: "laptop",
    label: "Laptop / gram",
    labelKo: "노트북·그램",
    icon: "💻",
    subreddits: ["reddit_lggram", "reddit_suggestalaptop", "reddit_mac", "reddit_macbookpro", "reddit_macsetups", "reddit_editors"],
  },
  {
    value: "lifestyle",
    label: "StanbyME / Lifestyle",
    labelKo: "스탠바이미·라이프스타일",
    icon: "✨",
    subreddits: ["reddit_stanbyme"],
  },
  {
    value: "general",
    label: "General / LG Hub",
    labelKo: "일반·LG Hub",
    icon: "💬",
    subreddits: ["reddit", "reddit_lg_userhub", "reddit_r/lg_userhub", "reddit_techsupport", "reddit_fixit"],
  },
  {
    value: "india",
    label: "India",
    labelKo: "인도",
    icon: "🇮🇳",
    subreddits: ["reddit_india"],
  },
];

function useRedditCategoryCounts() {
  return useQuery({
    queryKey: ["reddit-category-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("source")
        .like("source", "reddit%");
      if (error) throw error;

      const sourceCounts: Record<string, number> = {};
      for (const r of data || []) {
        sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1;
      }

      const result: Record<string, number> = {};
      let total = 0;
      for (const group of SUBREDDIT_GROUPS) {
        const count = group.subreddits.reduce((sum, s) => sum + (sourceCounts[s] || 0), 0);
        result[group.value] = count;
        total += count;
      }
      result["all"] = total;
      return result;
    },
    staleTime: 60_000,
  });
}

/** Convert selected category back to source filter for child components */
export function redditCategoryToSources(category: string): string[] | null {
  if (category === "all") return null;
  const group = SUBREDDIT_GROUPS.find(g => g.value === category);
  return group?.subreddits || null;
}

function RedditFilterBar({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLang();
  const { data: counts } = useRedditCategoryCounts();

  const total = counts?.["all"] || 0;

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-foreground">
          {t("Reddit Category Filter", "Reddit 카테고리별 보기")}
        </span>
        <span className="text-[10px] text-muted-foreground ml-1">
          {t(
            `(${SUBREDDIT_GROUPS.length} categories · ${total.toLocaleString()} posts)`,
            `(${SUBREDDIT_GROUPS.length}개 카테고리 · ${total.toLocaleString()}건)`
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {/* All button */}
        <button
          onClick={() => onChange("all")}
          className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all flex items-center gap-1 ${
            selected === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          🌐 {t("All", "전체")}
          {total > 0 && <span className="text-[9px] opacity-70">{total.toLocaleString()}</span>}
        </button>

        <span className="text-border mx-1 text-xs">|</span>

        {SUBREDDIT_GROUPS.map((g) => {
          const count = counts?.[g.value] || 0;
          if (count === 0) return null;
          return (
            <button
              key={g.value}
              onClick={() => onChange(g.value)}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all flex items-center gap-1 ${
                selected === g.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {g.icon} {t(g.label, g.labelKo)}
              {count > 0 && <span className="text-[9px] opacity-70">{count.toLocaleString()}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const RedditPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Convert category to source filter for child components
  // Child components expect 'country' prop but we pass category-based source filter
  const sourceFilter = selectedCategory;

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={MessageSquare}
        title="💬 Reddit Intelligence"
        description="Reddit 커뮤니티에서 수집된 실사용자 VOC를 분석합니다. 카테고리별 감성 분류, VOC 카드, AI 카피 생성, 경쟁사 언급 분석을 확인하세요."
      />
      <RedditFilterBar selected={selectedCategory} onChange={setSelectedCategory} />
      <RedditWeeklySummary country={sourceFilter} />
      <RedditBucketDashboard country={sourceFilter} />
      <RedditVocPostCards country={sourceFilter} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RedditCategoryAnalysis country={sourceFilter} />
        <RedditCompetitorMentions country={sourceFilter} />
      </div>
      <RedditCountryInsights category={sourceFilter} />
    </div>
  );
};

export default RedditPage;
