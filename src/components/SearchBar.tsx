import { useState } from "react";
import { Search, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getProductList } from "@/data/dummyData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const categoryLabels: Record<string, string> = {
  TV: "📺 TV",
  Monitor: "🖥️ Monitor",
  Laptop: "💻 Laptop",
  "Home Appliance": "🏠 Home Appliance",
  Projector: "🎬 Projector",
};

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const productList = getProductList();

  // Group by category
  const grouped = productList.reduce<Record<string, typeof productList>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  const handleSelectProduct = (name: string) => {
    setQuery(name);
    setOpen(false);
    onSearch(name);
  };

  // Quick search by category
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
            placeholder="모델번호 또는 카테고리 검색 (예: WashTower, OLED)"
            className="pl-12 h-14 text-lg bg-secondary border-border focus:border-primary focus:ring-primary/30"
          />
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-14 px-4" title="제품 리스트 보기">
              <List className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-semibold">제품 리스트</p>
              <p className="text-xs text-muted-foreground">카테고리 또는 모델번호 클릭 시 검색</p>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-3">
              {Object.entries(grouped).map(([category, products]) => (
                <div key={category}>
                  <button
                    onClick={() => handleCategorySearch(category)}
                    className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                  >
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary cursor-pointer">
                      {categoryLabels[category] || category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">전체 검색 →</span>
                  </button>
                  {products.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => handleSelectProduct(p.name)}
                      className="w-full text-left px-3 py-2 rounded text-sm hover:bg-secondary transition-colors flex items-center justify-between"
                    >
                      <span className="font-mono text-xs">{p.name}</span>
                      <span className="text-xs text-muted-foreground truncate ml-2 max-w-[140px]">
                        {p.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="h-14 px-8 text-lg glow-primary"
        >
          {isLoading ? "분석 중..." : "분석"}
        </Button>
      </form>
      <div className="flex gap-2 mt-4 flex-wrap">
        {Object.keys(grouped).map((category) => (
          <button
            key={category}
            onClick={() => { setQuery(category); onSearch(category); }}
            className="px-4 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors border border-border"
          >
            {categoryLabels[category] || category}
          </button>
        ))}
      </div>
    </div>
  );
}
