import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { SentimentResult } from "@/lib/sentiment";

interface SentimentChartProps {
  sentiment: SentimentResult;
}

const COLORS = {
  positive: "hsl(142, 76%, 45%)",
  negative: "hsl(0, 72%, 51%)",
  neutral: "hsl(215, 20%, 55%)",
};

export function SentimentChart({ sentiment }: SentimentChartProps) {
  const data = [
    { name: "긍정", value: sentiment.positive, color: COLORS.positive },
    { name: "부정", value: sentiment.negative, color: COLORS.negative },
    { name: "중립", value: sentiment.neutral, color: COLORS.neutral },
  ].filter((d) => d.value > 0);

  const total = sentiment.positive + sentiment.negative + sentiment.neutral;

  return (
    <div className="gradient-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 font-heading">감성 분석 결과</h3>
      <div className="flex items-center gap-8">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(222, 47%, 9%)",
                  border: "1px solid hsl(222, 30%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(210, 40%, 95%)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {[
            { label: "긍정", value: sentiment.positive, color: "bg-success", pct: total > 0 ? Math.round((sentiment.positive / total) * 100) : 0 },
            { label: "부정", value: sentiment.negative, color: "bg-destructive", pct: total > 0 ? Math.round((sentiment.negative / total) * 100) : 0 },
            { label: "중립", value: sentiment.neutral, color: "bg-muted-foreground", pct: total > 0 ? Math.round((sentiment.neutral / total) * 100) : 0 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-sm text-muted-foreground w-10">{item.label}</span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${item.pct}%` }} />
              </div>
              <span className="text-sm font-mono font-medium w-16 text-right">{item.value}건 ({item.pct}%)</span>
            </div>
          ))}
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              평균 감성 점수: <span className="text-gradient font-bold text-lg">{(sentiment.averageScore * 100).toFixed(0)}</span>/100
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
