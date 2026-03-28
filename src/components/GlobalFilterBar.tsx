import { Globe, Clock } from "lucide-react";

export interface GlobalFilters {
  country: string;
  timeframe: "weekly" | "cumulative";
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

export function GlobalFilterBar({ filters, onChange }: GlobalFilterBarProps) {
  const set = (patch: Partial<GlobalFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-card border-b border-border px-5 py-2.5 flex flex-wrap items-center gap-5">
      {/* Country */}
      <div className="flex items-center gap-2">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground font-medium mr-1">Country</span>
        <div className="flex items-center rounded-lg bg-secondary/60 p-0.5 gap-0.5">
          {COUNTRIES.map((c) => (
            <button
              key={c.value}
              onClick={() => set({ country: c.value })}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
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
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground font-medium mr-1">Timeframe</span>
        <div className="flex items-center rounded-lg bg-secondary/60 p-0.5 gap-0.5">
          {(["weekly", "cumulative"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => set({ timeframe: tf })}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors capitalize ${
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
    </div>
  );
}
