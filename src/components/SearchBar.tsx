import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getProductNames } from "@/data/dummyData";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const suggestions = getProductNames();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="LG 제품명을 입력하세요 (예: LG OLED C4)"
            className="pl-12 h-14 text-lg bg-secondary border-border focus:border-primary focus:ring-primary/30"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="h-14 px-8 text-lg glow-primary"
        >
          {isLoading ? "분석 중..." : "분석"}
        </Button>
      </form>
      <div className="flex gap-2 mt-4 flex-wrap">
        {suggestions.map((name) => (
          <button
            key={name}
            onClick={() => { setQuery(name); onSearch(name); }}
            className="px-4 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors border border-border"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
