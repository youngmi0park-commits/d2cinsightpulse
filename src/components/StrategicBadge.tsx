import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { isStrategicCountry } from "@/lib/strategicCountries";
import { useLang } from "@/contexts/LanguageContext";

interface Props {
  iso?: string | null;
  /** sm = 9px star, md = 10px star */
  size?: "sm" | "md";
  className?: string;
}

/** 작은 ⭐ 배지 — 리뷰 전략 12개국에만 노출 */
export function StrategicBadge({ iso, size = "sm", className = "" }: Props) {
  const { t } = useLang();
  if (!isStrategicCountry(iso)) return null;
  const star = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-0.5 px-1 py-[1px] rounded-sm bg-amber-400/15 text-amber-600 border border-amber-400/30 ${className}`}
            aria-label="Strategic country"
          >
            <Star className={`${star} fill-current`} />
            <span className="text-[8px] font-bold leading-none tracking-tight">
              {t("STRAT", "전략")}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] max-w-[180px]">
          {t("Review strategic country (12 priority markets)", "리뷰 전략 12개국 우선 모니터링")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
