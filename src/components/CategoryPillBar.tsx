import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const CATEGORY_ITEMS = [
  { cat: "all", label: "All", emoji: "📋" },
  { cat: "TV", label: "TV", emoji: "📺" },
  { cat: "Washer", label: "Washer", emoji: "👕" },
  { cat: "Monitor", label: "Monitor", emoji: "🖥" },
  { cat: "Refrigerator", label: "Refrigerator", emoji: "🧊" },
  { cat: "AC", label: "Air Conditioner", emoji: "❄️" },
  { cat: "Soundbar", label: "Audio", emoji: "🔊" },
  { cat: "Laptop", label: "Laptop", emoji: "💻" },
  { cat: "Dryer", label: "Dryer", emoji: "👕" },
  { cat: "Dishwasher", label: "Dishwasher", emoji: "🍽" },
  { cat: "Vacuum", label: "Vacuum", emoji: "🧹" },
  { cat: "Air Purifier", label: "Air Purifier", emoji: "🌿" },
  { cat: "Range", label: "Oven & Range", emoji: "🍳" },
  { cat: "Microwave", label: "Microwave", emoji: "📡" },
];

const COUNTRY_SOURCE_MAP: Record<string, string[]> = {
  US: ["lge_com_us"],
  UK: ["lge_com_uk"],
  DE: ["lge_com_de"],
  AU: ["lge_com_au"],
  IN: ["lge_com_in"],
  TW: ["lge_com_tw"],
  JP: ["lge_com_jp"],
  TH: ["lge_com_th"],
};

function useCategoryCounts(country?: string) {
  return useQuery({
    queryKey: ["category-counts-for-pills", country || "global"],
    queryFn: async () => {
      if (!country || country === "all") {
        // Use existing RPC for global counts
        const { data, error } = await supabase.rpc("get_category_counts");
        if (error) throw error;
        const map: Record<string, number> = {};
        for (const row of data || []) {
          map[row.category] = Number(row.count);
        }
        return map;
      }

      // Country-filtered: query reviews joined with products, filtered by source
      const sources = COUNTRY_SOURCE_MAP[country] || [];
      if (sources.length === 0) return {};

      // Get all reviews for this country's sources, join with product category
      const { data, error } = await supabase
        .from("reviews")
        .select("product_id, products!inner(category)")
        .in("source", sources);

      if (error) throw error;

      const map: Record<string, number> = {};
      for (const row of data || []) {
        const cat = (row as any).products?.category;
        if (cat) map[cat] = (map[cat] || 0) + 1;
      }
      return map;
    },
    staleTime: 5 * 60_000,
  });
}

interface CategoryPillBarProps {
  selected: string;
  onSelect: (cat: string) => void;
  isLoading?: boolean;
  hasResult?: boolean;
  country?: string;
}

export function CategoryPillBar({ selected, onSelect, isLoading = false, hasResult = false, country }: CategoryPillBarProps) {
  const { data: counts } = useCategoryCounts(country);

  // Sort by review count (descending), keep "all" first
  const sorted = [...CATEGORY_ITEMS].sort((a, b) => {
    if (a.cat === "all") return -1;
    if (b.cat === "all") return 1;
    return (counts?.[b.cat] || 0) - (counts?.[a.cat] || 0);
  });

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {sorted.map((item) => {
        const count = item.cat === "all" ? undefined : counts?.[item.cat];
        const isActive = selected === item.cat && hasResult;
        return (
          <button
            key={item.cat}
            onClick={() => onSelect(item.cat)}
            disabled={isLoading}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all disabled:opacity-50 whitespace-nowrap ${
              isActive
                ? "bg-foreground/10 text-foreground border-foreground/20 ring-1 ring-primary/30"
                : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span className="text-[12px]">{item.emoji}</span>
            {item.label}
            {count !== undefined && count > 0 && (
              <span className="text-[9px] opacity-60">{count.toLocaleString()}</span>
            )}
            {isLoading && selected === item.cat && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
          </button>
        );
      })}
    </div>
  );
}
