import { Globe, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ── helpers ── */
const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "is","it","was","are","were","be","been","have","has","had","this","that",
  "from","as","not","so","very","just","i","my","me","we","our","you","your",
  "they","them","their","its","no","do","does","did","will","would","can","could",
  "should","about","all","one","two","if","up","out","more","also","than","then",
  "into","over","after","only","any","each","which","what","when","how","where",
  "some","other","new","like","get","got","much","really","product","lg","good",
  "great","review","use","used","using","bought","buy","still","back","well","work",
  "works","working","make","made","even","time","first","way","thing","things",
]);

function extractKeywords(texts: string[], limit = 8): { word: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const t of texts) {
    const words = t.toLowerCase().replace(/[^a-z0-9\s'-]/g, "").split(/\s+/);
    const seen = new Set<string>();
    for (const w of words) {
      if (w.length < 3 || STOP_WORDS.has(w) || seen.has(w)) continue;
      seen.add(w);
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

/* ── source label map ── */
function sourceLabel(source: string): string {
  if (source.startsWith("amazon")) return "Amazon";
  if (source.startsWith("youtube")) return "YouTube";
  if (source.startsWith("bestbuy")) return "Best Buy";
  if (source.startsWith("walmart")) return "Walmart";
  if (source.startsWith("twitter") || source.startsWith("x_")) return "X (Twitter)";
  if (source.startsWith("forum")) return "Forums";
  return source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CommunityData {
  source: string;
  label: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  topPositiveProducts: { name: string; count: number; keywords: string[] }[];
  topNegativeProducts: { name: string; count: number; keywords: string[] }[];
}

function useCommunityData() {
  return useQuery({
    queryKey: ["community-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("source, sentiment, content, product_id, products!inner(display_name, category)")
        .not("source", "like", "lge_com%")
        .not("source", "like", "reddit%")
        .limit(1000);
      if (error) throw error;

      // Group by source
      const bySource: Record<string, typeof data> = {};
      for (const r of data || []) {
        const src = r.source;
        if (!bySource[src]) bySource[src] = [];
        bySource[src].push(r);
      }

      const communities: CommunityData[] = Object.entries(bySource).map(([src, rows]) => {
        const positive = rows.filter((r) => r.sentiment === "positive");
        const negative = rows.filter((r) => r.sentiment === "negative");
        const neutral = rows.filter((r) => r.sentiment !== "positive" && r.sentiment !== "negative");

        // Top products by positive
        const posProd: Record<string, { name: string; count: number; contents: string[] }> = {};
        for (const r of positive) {
          const p = r.products as any;
          const name = p?.display_name || "Unknown";
          if (!posProd[name]) posProd[name] = { name, count: 0, contents: [] };
          posProd[name].count++;
          posProd[name].contents.push(r.content);
        }

        // Top products by negative
        const negProd: Record<string, { name: string; count: number; contents: string[] }> = {};
        for (const r of negative) {
          const p = r.products as any;
          const name = p?.display_name || "Unknown";
          if (!negProd[name]) negProd[name] = { name, count: 0, contents: [] };
          negProd[name].count++;
          negProd[name].contents.push(r.content);
        }

        const topPos = Object.values(posProd)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((p) => ({ name: p.name, count: p.count, keywords: extractKeywords(p.contents, 5).map((k) => k.word) }));

        const topNeg = Object.values(negProd)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((p) => ({ name: p.name, count: p.count, keywords: extractKeywords(p.contents, 5).map((k) => k.word) }));

        return {
          source: src,
          label: sourceLabel(src),
          total: rows.length,
          positive: positive.length,
          negative: negative.length,
          neutral: neutral.length,
          topPositiveProducts: topPos,
          topNegativeProducts: topNeg,
        };
      });

      return communities.sort((a, b) => b.total - a.total);
    },
    staleTime: 60_000,
  });
}

function CommunityCard({ community }: { community: CommunityData }) {
  const posPercent = community.total ? Math.round((community.positive / community.total) * 100) : 0;
  const negPercent = community.total ? Math.round((community.negative / community.total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{community.label}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{community.total}건</Badge>
        </div>
        {/* Sentiment bar */}
        <div className="h-2 rounded-full overflow-hidden flex bg-secondary mt-2">
          <div className="bg-emerald-500 h-full" style={{ width: `${posPercent}%` }} />
          <div className="bg-muted h-full" style={{ width: `${100 - posPercent - negPercent}%` }} />
          <div className="bg-destructive h-full" style={{ width: `${negPercent}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span className="text-emerald-600 font-medium">{posPercent}% 긍정</span>
          <span className="text-destructive font-medium">{negPercent}% 부정</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Positive products */}
        {community.topPositiveProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[11px] font-semibold text-emerald-700">긍정 리뷰 TOP 제품</span>
            </div>
            <div className="space-y-1.5">
              {community.topPositiveProducts.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-emerald-600 font-bold shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{p.name} <span className="text-muted-foreground">({p.count}건)</span></div>
                    {p.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {p.keywords.map((kw) => (
                          <Badge key={kw} variant="outline" className="text-[9px] px-1 py-0 border-emerald-200 text-emerald-700">{kw}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Negative products */}
        {community.topNegativeProducts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
              <span className="text-[11px] font-semibold text-destructive">부정 리뷰 TOP 제품</span>
            </div>
            <div className="space-y-1.5">
              {community.topNegativeProducts.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-destructive font-bold shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{p.name} <span className="text-muted-foreground">({p.count}건)</span></div>
                    {p.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {p.keywords.map((kw) => (
                          <Badge key={kw} variant="outline" className="text-[9px] px-1 py-0 border-destructive/30 text-destructive">{kw}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {community.topPositiveProducts.length === 0 && community.topNegativeProducts.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">제품별 데이터 없음</p>
        )}
      </CardContent>
    </Card>
  );
}

const CommunitiesPage = () => {
  const { data: communities, isLoading } = useCommunityData();
  const total = communities?.reduce((s, c) => s + c.total, 0) || 0;

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Globe}
        title="🌐 Other Communities"
        description="LG.com과 Reddit을 제외한 Amazon, YouTube, Best Buy 등 외부 커뮤니티에서 수집된 리뷰를 채널별로 분석합니다. 긍정·부정 리뷰가 많은 제품과 주요 키워드를 확인하세요."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !communities || communities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            LG.com, Reddit 이외 채널의 수집 데이터가 아직 없습니다.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Source count buttons */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">커뮤니티별 리뷰 수</CardTitle>
                <Badge variant="secondary" className="text-[10px] ml-auto">Total {total.toLocaleString()}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {communities.map((c) => (
                  <div key={c.source} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-4 py-2.5 min-w-[120px]">
                    <div>
                      <div className="text-xs font-semibold text-foreground">{c.label}</div>
                      <div className="text-lg font-bold text-primary">{c.total.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Community cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((c) => (
              <CommunityCard key={c.source} community={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CommunitiesPage;
