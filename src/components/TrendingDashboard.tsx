import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ExternalLink, MessageSquare, ShoppingCart, ThumbsUp, ThumbsDown, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  redditTrending, amazonTrending,
  redditKeywords, amazonKeywords,
  type TrendingProduct, type TrendingKeyword,
} from "@/data/trendingData";

interface TrendingDashboardProps {
  onProductClick?: (modelNumber: string) => void;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function SentimentBar({ score }: { score: number }) {
  const color = score >= 85 ? "bg-green-500" : score >= 70 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{score}</span>
    </div>
  );
}

function ProductTable({ products, onProductClick }: { products: TrendingProduct[]; onProductClick?: (m: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium w-8">#</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium">제품</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">카테고리</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">언급수</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium hidden md:table-cell">감성점수</th>
            <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">변동</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={p.modelNumber}
              className="border-b border-border/50 hover:bg-primary/5 transition-colors cursor-pointer group"
              onClick={() => onProductClick?.(p.modelNumber)}
            >
              <td className="py-2.5 px-2">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  p.rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {p.rank}
                </span>
              </td>
              <td className="py-2.5 px-2">
                <div>
                  <span className="font-mono text-xs font-medium group-hover:text-primary transition-colors">
                    {p.modelNumber}
                  </span>
                  <ExternalLink className="inline h-3 w-3 ml-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs text-muted-foreground">{p.displayName}</span>
              </td>
              <td className="py-2.5 px-2 hidden sm:table-cell">
                <Badge variant="outline" className="text-xs">{p.category}</Badge>
              </td>
              <td className="py-2.5 px-2 text-right font-mono text-xs">
                {p.mentions.toLocaleString()}
              </td>
              <td className="py-2.5 px-2 hidden md:table-cell">
                <SentimentBar score={p.sentimentScore} />
              </td>
              <td className="py-2.5 px-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendIcon trend={p.trend} />
                  <span className={`text-xs font-mono ${
                    p.changePercent > 0 ? "text-green-600" : p.changePercent < 0 ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {p.changePercent > 0 ? "+" : ""}{p.changePercent}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeywordPanel({ keywords }: { keywords: TrendingKeyword[] }) {
  const positive = keywords.filter((k) => k.sentiment === "positive");
  const negative = keywords.filter((k) => k.sentiment === "negative");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Positive */}
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ThumbsUp className="h-4 w-4 text-green-600" />
          <h4 className="text-sm font-semibold text-green-800">긍정 키워드</h4>
        </div>
        <div className="space-y-2">
          {positive.map((kw) => (
            <div key={kw.keyword} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{kw.keyword}</span>
                {kw.change > 20 && (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-green-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min((kw.count / 3500) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-green-700 w-12 text-right">
                  {kw.count.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Negative */}
      <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ThumbsDown className="h-4 w-4 text-red-500" />
          <h4 className="text-sm font-semibold text-red-800">부정 키워드</h4>
        </div>
        <div className="space-y-2">
          {negative.map((kw) => (
            <div key={kw.keyword} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{kw.keyword}</span>
                {kw.change > 20 && (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-red-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min((kw.count / 3500) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-red-700 w-12 text-right">
                  {kw.count.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrendingDashboard({ onProductClick }: TrendingDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold font-heading">📡 실시간 트렌딩 대시보드</h2>
        <Badge variant="secondary" className="text-xs">
          Live · 주간 집계
        </Badge>
      </div>

      <Tabs defaultValue="reddit" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="reddit" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Reddit
          </TabsTrigger>
          <TabsTrigger value="amazon" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Amazon
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reddit" className="space-y-6 mt-4">
          <div className="gradient-card rounded-xl border border-border p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              🔥 Reddit 언급량 TOP 10
            </h3>
            <ProductTable products={redditTrending} onProductClick={onProductClick} />
          </div>
          <div className="gradient-card rounded-xl border border-border p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              💬 Reddit 주요 긍·부정 키워드
            </h3>
            <KeywordPanel keywords={redditKeywords} />
          </div>
        </TabsContent>

        <TabsContent value="amazon" className="space-y-6 mt-4">
          <div className="gradient-card rounded-xl border border-border p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              🔥 Amazon 언급량 TOP 10
            </h3>
            <ProductTable products={amazonTrending} onProductClick={onProductClick} />
          </div>
          <div className="gradient-card rounded-xl border border-border p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              💬 Amazon 주요 긍·부정 키워드
            </h3>
            <KeywordPanel keywords={amazonKeywords} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
