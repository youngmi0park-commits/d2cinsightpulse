import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { Layers, Monitor, Ruler } from "lucide-react";

export type GroupMode = "subcategory" | "product" | "inch";

interface ResultsGroupFilterProps {
  products: Array<{ name: string; displayName: string; category: string }>;
  groupMode: GroupMode;
  onGroupModeChange: (mode: GroupMode) => void;
  selectedFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

// Extract sub-category from display name (OLED, QNED, NanoCell, UHD, StanbyME, UltraGear, etc.)
export function extractSubCategory(displayName: string): string {
  const upper = displayName.toUpperCase();
  if (upper.includes("STANBYME") || upper.includes("STAND BY ME") || upper.includes("STANBY ME")) return "StanbyME";
  if (upper.includes("OLED")) return "OLED";
  if (upper.includes("QNED")) return "QNED";
  if (upper.includes("NANOCELL")) return "NanoCell";
  if (upper.includes("ULTRAGEAR")) return "UltraGear";
  if (upper.includes("ULTRAFINE")) return "UltraFine";
  if (upper.includes("ULTRAWIDE")) return "UltraWide";
  if (upper.includes("SMART MONITOR") || upper.includes("SMART SWING")) return "Smart Monitor";
  if (upper.includes("OLED FLEX")) return "OLED";
  if (upper.includes("GRAM")) return "gram";
  if (upper.includes("WASHTOWER")) return "WashTower";
  if (upper.includes("DUAL INVERTER")) return "Dual Inverter";
  if (upper.includes("CINEBEAM")) return "CineBeam";
  if (upper.includes("INSTAVIEW")) return "InstaView";
  if (upper.includes("TONE FREE")) return "Tone Free";
  if (upper.includes("SOUND BAR") || upper.includes("SOUNDBAR")) return "Soundbar";
  if (upper.includes("XBOOM")) return "XBOOM";
  if (upper.includes("4K")) return "4K UHD";
  return "Other";
}

// Extract inch size from display name
export function extractInch(displayName: string): string | null {
  // Patterns: "55-inch", "55\"", "55 inch", "27-Inch", "42LG" (TV size prefix)
  const match = displayName.match(/(\d{2,3})[\s-]?(?:inch|"|''|인치)/i);
  if (match) return `${match[1]}"`;
  // Try pattern like "42LG" or just a leading number for TVs
  const leadingMatch = displayName.match(/^(?:LG\s+)?(\d{2,3})\s*[A-Z]/i);
  if (leadingMatch) {
    const size = parseInt(leadingMatch[1]);
    if (size >= 20 && size <= 120) return `${size}"`;
  }
  return null;
}

export function ResultsGroupFilter({
  products,
  groupMode,
  onGroupModeChange,
  selectedFilter,
  onFilterChange,
}: ResultsGroupFilterProps) {
  const { t } = useLang();

  const groupOptions: { mode: GroupMode; label: string; icon: React.ReactNode }[] = [
    { mode: "subcategory", label: t("Sub-Category", "카테고리별"), icon: <Layers className="h-3.5 w-3.5" /> },
    { mode: "product", label: t("Product", "제품명별"), icon: <Monitor className="h-3.5 w-3.5" /> },
    { mode: "inch", label: t("Size (inch)", "인치별"), icon: <Ruler className="h-3.5 w-3.5" /> },
  ];

  const filterValues = useMemo(() => {
    const values = new Map<string, number>();
    for (const p of products) {
      let key: string;
      if (groupMode === "subcategory") {
        key = extractSubCategory(p.displayName);
      } else if (groupMode === "inch") {
        key = extractInch(p.displayName) || t("Unknown", "미분류");
      } else {
        key = p.name;
      }
      values.set(key, (values.get(key) || 0) + 1);
    }
    // Sort: by count desc, then alphabetically
    return Array.from(values.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [products, groupMode, t]);

  return (
    <div className="space-y-3">
      {/* Group mode selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">{t("Group by", "정렬 기준")}:</span>
        {groupOptions.map((opt) => (
          <button
            key={opt.mode}
            onClick={() => {
              onGroupModeChange(opt.mode);
              onFilterChange(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              groupMode === opt.mode
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30 hover:text-primary"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onFilterChange(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            selectedFilter === null
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-secondary/30 text-muted-foreground border-border hover:border-primary/20"
          }`}
        >
          {t("All", "전체")} ({products.length})
        </button>
        {filterValues.map(([value, count]) => (
          <button
            key={value}
            onClick={() => onFilterChange(selectedFilter === value ? null : value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              selectedFilter === value
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary/30 text-muted-foreground border-border hover:border-primary/20"
            }`}
          >
            {value} ({count})
          </button>
        ))}
      </div>
    </div>
  );
}
