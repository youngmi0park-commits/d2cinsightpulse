import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Globe, MessageSquare } from "lucide-react";
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
];

export function ReviewCollectButtons() {
  const { t } = useLang();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { collected: number; errors: number } | null>>({});

  const handleCollect = async (channelId: string) => {
    setLoading((prev) => ({ ...prev, [channelId]: true }));
    setResults((prev) => ({ ...prev, [channelId]: null }));

    try {
      const functionName = channelId === "lge_com_direct" ? "crawl-lge-reviews" : "collect-reviews";
      const body = channelId === "lge_com_direct" 
        ? { categories: ["Refrigerator", "Washer"], regions: ["us", "uk"], maxPages: 3 }
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
