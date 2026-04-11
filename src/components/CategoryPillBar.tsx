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

function useCategoryCounts() {
  return useQuery({
    queryKey: ["category-counts-for-pills"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_category_counts");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data || []) {
        map[row.category] = Number(row.count);
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
}

export function CategoryPillBar({ selected, onSelect, isLoading = false, hasResult = false }: CategoryPillBarProps) {
  const { data: counts } = useCategoryCounts();

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
