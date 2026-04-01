import { useState, useMemo } from "react";
import { Search, List, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { useProductListWithCounts, ProductWithCount } from "@/hooks/useProductListWithCounts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const categoryLabels: Record<string, string> = {
  TV: "📺 TV",
  Monitor: "🖥️ Monitor",
  Washer: "🧺 Washer",
  Dryer: "🧺 Dryer",
  Laptop: "💻 Laptop",
  Projector: "🎬 Projector",
  "Refrigerator": "🧊 Refrigerator",
  "Kitchen Appliance": "🍳 Kitchen Appliance",
  Audio: "🔊 Audio",
  "Air Conditioner": "❄️ Air Conditioner",
};

// Category display order
const categoryOrder = ["TV", "Monitor", "Washer", "Air Conditioner", "Audio", "Laptop", "Dryer", "Refrigerator", "Projector", "Kitchen Appliance"];

const TOP_N = 3;

// Quick-search buttons
const quickSearchButtons = [
  { label: "📺 TV", query: "TV" },
  { label: "🧺 Washer", query: "Washer" },
  { label: "🖥️ Monitor", query: "Monitor" },
  { label: "🧊 Refrigerator", query: "Refrigerator" },
  { label: "❄️ Air Conditioner", query: "Air Conditioner" },
  { label: "🔊 Audio", query: "Audio" },
  { label: "💻 Laptop", query: "Laptop" },
  { label: "🧺 Dryer", query: "Dryer" },
  { label: "🍽️ Dishwasher", query: "Dishwasher" },
  { label: "🧹 Vacuum", query: "Vacuum" },
  { label: "🌬️ Air Purifier", query: "Air Purifier" },
  { label: "🍳 Oven & Range", query: "Oven" },
];

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { t } = useLang();
  const { data: productList = [], isLoading: productsLoading } = useProductListWithCounts();

  // Check if houzz has 100+ reviews to show quick-search button
  const { data: houzzCount = 0 } = useQuery({
    queryKey: ["houzz-review-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("source", "houzz");
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  const dynamicButtons = useMemo(() => {
    const base = [...quickSearchButtons];
    if (houzzCount >= 100) {
      base.push({ label: "🏠 Houzz", query: "houzz" });
    }
    return base;
  }, [houzzCount]);

  const grouped = useMemo(() => {
    const g: Record<string, ProductWithCount[]> = {};
    for (const p of productList) {
      if (!g[p.category]) g[p.category] = [];
      g[p.category].push(p);
    }
    // Already sorted by review_count desc from hook
    return g;
  }, [productList]);

  const sortedCategories = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [grouped]);

  const toggleExpand = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  const handleSelectProduct = (name: string) => {
    setQuery(name);
    setOpen(false);
    onSearch(name);
  };

  const handleCategorySearch = (category: string) => {
    setQuery(category);
    setOpen(false);
    onSearch(category);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search by model number or category (e.g. WashTower, OLED)", "모델번호 또는 카테고리 검색 (예: WashTower, OLED)")}
            className="pl-12 h-14 text-lg bg-secondary border-border focus:border-primary focus:ring-primary/30"
          />
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-14 px-4" title={t("View product list", "제품 리스트 보기")}>
              <List className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-semibold">{t("Product List", "제품 리스트")}</p>
              <p className="text-xs text-muted-foreground">
                {t("Top 3 by review count per category • Click to expand", "카테고리별 리뷰 상위 3개 우선 표시 • 클릭하여 확장")}
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto p-2 space-y-2">
              {productsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("Loading...", "로딩 중...")}</p>
              ) : (
                sortedCategories.map((category) => {
                  const products = grouped[category];
                  const isExpanded = expandedCategories.has(category);
                  const hasMore = products.length > TOP_N;
                  const visibleProducts = isExpanded ? products : products.slice(0, TOP_N);
                  const totalReviews = products.reduce((sum, p) => sum + p.review_count, 0);

                  return (
                    <div key={category} className="border border-border/50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleCategorySearch(category)}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 bg-secondary/50 hover:bg-primary/10 transition-colors"
                      >
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary cursor-pointer">
                          {categoryLabels[category] || category}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {products.length}{t(" products", "개")} · {totalReviews}{t(" reviews", "건")}
                        </span>
                      </button>
                      <div className="divide-y divide-border/30">
                        {visibleProducts.map((p, idx) => (
                          <button
                            key={p.id}
                            onClick={() => handleSelectProduct(p.model_number)}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                          >
                            {idx < TOP_N && !isExpanded && (
                              <span className="text-xs font-bold text-primary/70 w-4">{idx + 1}</span>
                            )}
                            {(isExpanded || idx >= TOP_N) && (
                              <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                            )}
                            <span className="font-mono text-xs truncate flex-1">{p.model_number}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {p.display_name}
                            </span>
                            {p.review_count > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                                {p.review_count}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                      {hasMore && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(category); }}
                          className="w-full text-center py-1 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 bg-secondary/30"
                        >
                          {isExpanded ? (
                            <><ChevronUp className="h-3 w-3" />{t("Collapse", "접기")}</>
                          ) : (
                            <><ChevronDown className="h-3 w-3" />{t(`+${products.length - TOP_N} more`, `+${products.length - TOP_N}개 더보기`)}</>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="h-14 px-8 text-lg glow-primary"
        >
          {isLoading ? t("Analyzing...", "분석 중...") : t("Analyze", "분석")}
        </Button>
      </form>
      <div className="flex gap-2 mt-4 flex-wrap">
        {dynamicButtons.map((btn) => (
          <button
            key={btn.query}
            onClick={() => { setQuery(btn.query); onSearch(btn.query); }}
            className="px-4 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors border border-border"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
