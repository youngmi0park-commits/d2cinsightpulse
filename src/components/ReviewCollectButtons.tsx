import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Globe, MessageSquare, Youtube } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";

interface ChannelDef {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  descriptionKo: string;
}

const COLLECT_CHANNELS: ChannelDef[] = [
  {
    id: "lge_com",
    label: "LG.com",
    icon: Globe,
    description: "Collect reviews & specs from lg.com/us",
    descriptionKo: "lg.com/us에서 리뷰 및 스펙 수집",
  },
  {
    id: "lge_com_direct",
    label: "LG.com US/UK",
    icon: Globe,
    description: "Direct crawl LG.com US & UK product pages (Refrigerator, Washer)",
    descriptionKo: "LG.com US/UK 제품 페이지 직접 크롤링 (냉장고, 세탁기)",
  },
  {
    id: "reddit",
    label: "Reddit",
    icon: MessageSquare,
    description: "Collect from Reddit communities",
    descriptionKo: "Reddit 커뮤니티에서 수집",
  },
  {
    id: "youtube_comments",
    label: "YouTube",
    icon: Youtube,
    description: "Collect comments from LG official YouTube channels (US, UK, Global, India, AU)",
    descriptionKo: "LG 공식 YouTube 채널 댓글 수집 (US, UK, Global, India, AU — 한국 제외)",
  },
  {
    id: "bestbuy_api",
    label: "Best Buy",
    icon: Globe,
    description: "Best Buy public API — US retail reviews & ratings",
    descriptionKo: "Best Buy 공개 API — 미국 리테일 리뷰 및 평점",
  },
  {
    id: "walmart_api",
    label: "Walmart",
    icon: Globe,
    description: "Walmart public API — US retail channel VOC",
    descriptionKo: "Walmart 공개 API — 미국 유통 채널 VOC",
  },
  {
    id: "target_api",
    label: "Target",
    icon: Globe,
    description: "Target public API — US retail channel VOC",
    descriptionKo: "Target 공개 API — 미국 유통 채널 VOC",
  },
  {
    id: "quora",
    label: "Quora",
    icon: MessageSquare,
    description: "Quora Q&A — product experience discussions",
    descriptionKo: "Quora Q&A — 제품 경험 토론 수집",
  },
  {
    id: "stackexchange",
    label: "Stack Exchange",
    icon: MessageSquare,
    description: "Stack Exchange / SuperUser — technical Q&A",
    descriptionKo: "Stack Exchange / SuperUser — 기술 Q&A 수집",
  },
];

export function ReviewCollectButtons() {
  const { t } = useLang();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { collected: number; errors: number } | null>>({});

  const handleCollect = async (channelId: string) => {
    setLoading((prev) => ({ ...prev, [channelId]: true }));
    setResults((prev) => ({ ...prev, [channelId]: null }));

    try {
      const functionName = channelId === "lge_com_direct" 
        ? "crawl-lge-reviews" 
        : channelId === "youtube_comments"
          ? "collect-youtube-comments"
          : "collect-reviews";
      const body = channelId === "lge_com_direct" 
        ? { categories: ["Refrigerator", "Washer"], regions: ["us", "uk"], maxPages: 3 }
        : channelId === "youtube_comments"
          ? { maxPerChannel: 3 }
          : { channels: [channelId] };

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Collection failed");

      setResults((prev) => ({
        ...prev,
        [channelId]: { collected: data.collected || 0, errors: data.errors || 0 },
      }));

      toast.success(
        t(
          `${data.collected} reviews collected from ${channelId}`,
          `${channelId}에서 ${data.collected}건의 리뷰를 수집했습니다`
        )
      );
    } catch (e: any) {
      console.error(`Collection error (${channelId}):`, e);
      toast.error(
        t(
          `Failed to collect from ${channelId}`,
          `${channelId}에서 수집 실패`
        )
      );
    } finally {
      setLoading((prev) => ({ ...prev, [channelId]: false }));
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {COLLECT_CHANNELS.map((ch) => {
        const Icon = ch.icon;
        const isLoading = loading[ch.id];
        const result = results[ch.id];

        return (
          <div key={ch.id} className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-primary/30 hover:bg-primary/10"
              onClick={() => handleCollect(ch.id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Icon className="h-3.5 w-3.5" />
                  <Download className="h-3 w-3" />
                </>
              )}
              {ch.label}
            </Button>
            {result && (
              <Badge
                variant="secondary"
                className="text-[10px] gap-1"
              >
                {result.collected} {t("collected", "수집")}
                {result.errors > 0 && (
                  <span className="text-destructive"> · {result.errors} err</span>
                )}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
