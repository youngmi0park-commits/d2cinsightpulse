import { Globe, Clock, Layers } from "lucide-react";

export interface GlobalFilters {
  country: string;
  timeframe: "weekly" | "cumulative";
  category: string;
}

interface GlobalFilterBarProps {
  filters: GlobalFilters;
  onChange: (filters: GlobalFilters) => void;
}

const COUNTRIES = [
  { value: "global", label: "Global" },
  { value: "US", label: "US" },
  { value: "UK", label: "UK" },
  { value: "CA", label: "CA" },
  { value: "AU", label: "AU" },
  { value: "DE", label: "DE" },
];

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "TV", label: "TV / Audio" },
  { value: "Refrigerator", label: "Home Appliances" },
  { value: "Monitor", label: "Monitors" },
  { value: "Laptop", label: "Laptops" },
];

export function GlobalFilterBar({ filters, onChange }: GlobalFilterBarProps) {
  const set = (patch: Partial<GlobalFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="sticky top-0 z-30 bg-card border-b border-border px-5 py-3 flex flex-wrap items-center gap-5">
      {/* Country */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center rounded-lg bg-secondary/60 p-0.5 gap-0.5">
          {COUNTRIES.map((c) => (
            <button
              key={c.value}
              onClick={() => set({ country: c.value })}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filters.country === c.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeframe */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center rounded-lg bg-secondary/60 p-0.5 gap-0.5">
          {(["weekly", "cumulative"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => set({ timeframe: tf })}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                filters.timeframe === tf
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center rounded-lg bg-secondary/60 p-0.5 gap-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => set({ category: cat.value })}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filters.category === cat.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
