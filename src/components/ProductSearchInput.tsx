import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Search, X, Loader2 } from "lucide-react";

interface Product {
  id: string;
  display_name: string;
  model_number: string;
  category: string;
  review_count?: number;
}

interface ProductSearchInputProps {
  onSelect: (product: Product) => void;
  placeholder?: string;
  className?: string;
}

export function ProductSearchInput({ onSelect, placeholder, className = "" }: ProductSearchInputProps) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-search-list-with-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, display_name, model_number, category, reviews(count)")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        display_name: p.display_name,
        model_number: p.model_number,
        category: p.category,
        review_count: p.reviews?.[0]?.count ?? 0,
      })).sort((a: Product, b: Product) => (b.review_count ?? 0) - (a.review_count ?? 0)) as Product[];
    },
    staleTime: 60_000 * 30,
  });

  const filtered = (products || []).filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      p.model_number.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }).slice(0, 15);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || t("Search product name or model...", "제품명 또는 모델명 검색...")}
          className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setIsOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full mt-1 w-full max-h-60 overflow-auto rounded-lg border border-border bg-popover shadow-lg"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs">{t("Loading...", "로딩 중...")}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {t("No products found", "검색 결과 없음")}
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p);
                  setQuery(p.display_name);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0"
              >
                <div className="font-medium text-foreground truncate">{p.display_name}</div>
                <div className="text-[10px] text-muted-foreground">{p.model_number} · {p.category}{p.review_count ? ` · ${p.review_count}건` : ""}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
