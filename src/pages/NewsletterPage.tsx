import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Mail, Calendar, ChevronDown, ChevronUp, FileText, Loader2, Sparkles, ExternalLink, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useNewsletterArchive,
  useNewsletterIssue,
} from "@/hooks/useNewsletterData";

/* ── Past Newsletters Archive (static fallback) ── */
const staticNewsletters = [
  {
    id: 2,
    title: "RTA Studio Weekly #2",
    date: "2026-03-24",
    summary: "LG OLED evo G6 시리즈 긍정 리뷰 급증, Reddit 커뮤니티 세탁기 VOC 집중 분석",
    content: `📊 주간 하이라이트 (2026.03.18 ~ 03.24)

■ 총 수집 리뷰: 1,247건 (전주 대비 +12%)
  - LG.com: 892건 | Reddit: 298건 | 기타 커뮤니티: 57건

■ 주요 인사이트
  1. LG OLED evo G6 시리즈 — 긍정 리뷰 대폭 증가
  2. LG 그램 Pro 17 — 신규 리뷰 유입 증가
  3. Reddit 세탁기 카테고리 VOC 집중`,
  },
  {
    id: 1,
    title: "RTA Studio Weekly #1",
    date: "2026-03-17",
    summary: "플랫폼 런칭 첫 주간 리포트 — 초기 데이터 수집 현황 및 베이스라인 설정",
    content: `📊 주간 하이라이트 (2026.03.11 ~ 03.17)

■ 총 수집 리뷰: 1,108건 (베이스라인 설정)
  - LG.com: 814건 | Reddit: 251건 | 기타 커뮤니티: 43건

■ 주요 인사이트
  1. LG OLED evo C6 시리즈 — 가성비 키워드 중심 긍정 리뷰
  2. LG 냉장고 InstaView — 기능 만족도 높음
  3. 초기 부정 시그널 모니터링`,
  },
];

const getDefaultWeek = () => {
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

const NewsletterPage = () => {
  const defaults = getDefaultWeek();
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("");
  const [weekStart, setWeekStart] = useState(defaults.start);
  const [weekEnd, setWeekEnd] = useState(defaults.end);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [staticOpenIds, setStaticOpenIds] = useState<Set<number>>(new Set());
  const [copying, setCopying] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [newsletterHtml, setNewsletterHtml] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);

  // Data hooks
  const { refetch: refetchIssue } = useNewsletterIssue(activeId);
  const { data: issues, refetch: refetchArchive } = useNewsletterArchive();

  const toggleStaticOpen = (id: number) => {
    setStaticOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Fetch full newsletter HTML from serve-newsletter ──
  const fetchNewsletterHtml = useCallback(async () => {
    setLoadingHtml(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("serve-newsletter", {
        body: { format: "json", baseUrl: window.location.origin },
      });
      if (error) throw error;
      if (result?.html) {
        setNewsletterHtml(result.html);
      }
    } catch {
      // silently fail — preview falls back to static template
    } finally {
      setLoadingHtml(false);
    }
  }, []);

  // ── AI Generate ──
  const handleGenerate = useCallback(async (forceRegen = false) => {
    setGenerating(true);
    setGenProgress("리뷰 데이터 분석 중...");
    const steps = [
      "국가별 VOC 집계 중...",
      "AI 마케팅 판단 생성 중...",
      "채널별 액션 저장 중...",
      "FAQ 우선순위 정리 중...",
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) setGenProgress(steps[stepIdx++]);
    }, 3000);

    try {
      const { data, error } = await supabase.functions.invoke("generate-newsletter", {
        body: { weekStart, weekEnd, forceRegenerate: forceRegen },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(
        `생성 완료 — ${data.totalReviews.toLocaleString()}건 분석 · ${data.countries}개국 · 감성 ${data.avgSentiment}점`
      );
      setActiveId(data.issueId);
      await refetchArchive();
      await refetchIssue();

      // Fetch full HTML for preview and Outlook copy
      setGenProgress("뉴스레터 HTML 렌더링 중...");
      await fetchNewsletterHtml();
    } catch (err) {
      toast.error("생성 실패: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      clearInterval(interval);
      setGenerating(false);
      setGenProgress("");
    }
  }, [weekStart, weekEnd, refetchArchive, refetchIssue, fetchNewsletterHtml]);

  // ── Outlook Copy ──
  const handleCopyForOutlook = useCallback(async () => {
    setCopying(true);
    try {
      // Use AI-generated HTML if available, otherwise fall back to static template
      let htmlContent: string;
      if (newsletterHtml) {
        htmlContent = newsletterHtml;
      } else {
        const res = await fetch("/newsletter-template.html");
        htmlContent = await res.text();
      }

      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;
      const outlookHtml = `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body>${bodyContent}</body></html>`;

      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([outlookHtml], { type: "text/html" }),
            "text/plain": new Blob(["RTA Studio 주간 뉴스레터"], { type: "text/plain" }),
          }),
        ]);
      } else {
        const el = document.createElement("div");
        el.innerHTML = outlookHtml;
        el.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;";
        document.body.appendChild(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        document.execCommand("copy");
        sel?.removeAllRanges();
        document.body.removeChild(el);
      }
      toast.success("복사 완료 — Outlook 새 메일 본문에 Ctrl+V로 붙여넣으세요");
      setShowTip(true);
      setTimeout(() => setShowTip(false), 7000);
    } catch {
      toast.error("복사 실패 — 브라우저 클립보드 권한을 허용해주세요");
    } finally {
      setCopying(false);
    }
  }, [newsletterHtml]);

  

  return (
    <div className="p-6 space-y-5 max-w-[1100px] mx-auto overflow-y-auto h-[calc(100vh-2rem)]">
      {/* ── Header ── */}
      <PageHeader
        icon={Mail}
        title="📧 주간 인사이트 뉴스레터"
        description="매주 화요일 오전 10시 발행 | AI 기반 국가별 마케팅 시그널 분석 · PMAX / Criteo / Affiliate / FAQ 중심"
      />

      {/* ── Top Action Bar ── */}
      <div className="flex items-center gap-3 flex-wrap bg-[hsl(var(--card))] border border-border rounded-xl p-3">
        {/* Date range */}
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="bg-transparent text-foreground text-xs border border-border rounded px-2 py-1"
          />
          <span className="text-muted-foreground">~</span>
          <input
            type="date"
            value={weekEnd}
            onChange={(e) => setWeekEnd(e.target.value)}
            className="bg-transparent text-foreground text-xs border border-border rounded px-2 py-1"
          />
        </div>

        {/* Generate button */}
        <button
          onClick={() => handleGenerate(false)}
          disabled={generating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                     bg-[#C8102E] hover:bg-[#A50028] disabled:opacity-50
                     text-white text-xs font-bold transition-all whitespace-nowrap"
        >
          {generating ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {genProgress || "생성중..."}</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" /> AI 생성</>
          )}
        </button>

        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={handleCopyForOutlook}
          disabled={copying}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border
                     text-xs font-medium hover:bg-muted/50 transition-all"
        >
          <Copy className="h-3.5 w-3.5" />
          {copying ? "복사 중..." : "Outlook 복사"}
        </button>
        <button
          onClick={() => {
            if (newsletterHtml) {
              const win = window.open("", "_blank");
              if (win) { win.document.write(newsletterHtml); win.document.close(); }
            } else {
              window.open("/newsletter-template.html", "_blank", "noopener,noreferrer");
            }
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border
                     text-xs font-medium hover:bg-muted/50 transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" /> 새 탭
        </button>
      </div>

      {/* ── Outlook Tip ── */}
      {showTip && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800">
          <span className="font-bold">✓</span>
          Outlook → 새 메일 → 본문 클릭 → <kbd className="px-1 py-0.5 bg-green-100 rounded text-[10px] font-mono">Ctrl+V</kbd> → 서식 그대로 삽입됩니다.
          <button onClick={() => setShowTip(false)} className="ml-auto underline text-[10px]">닫기</button>
        </div>
      )}

      {/* ── HTML Template Preview ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="text-sm font-bold tracking-widest uppercase">📮 뉴스레터 미리보기</h2>
          {newsletterHtml && (
            <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 bg-green-50">
              ✅ AI 생성 반영됨
            </Badge>
          )}
          {loadingHtml && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> HTML 렌더링 중...
            </span>
          )}
        </div>
        <iframe
          {...(newsletterHtml ? { srcDoc: newsletterHtml } : { src: "/newsletter-template.html" })}
          className="w-full border border-border rounded-xl bg-white"
          style={{ height: "70vh" }}
          title="Newsletter Preview"
        />
      </div>

      {/* ── Archive (date selector) ── */}
      {(() => {
        const dbItems = (issues ?? []).map((i: any) => ({
          kind: "db" as const,
          id: i.id,
          label: `${i.week_start} ~ ${i.week_end}${i.title ? ` · ${i.title}` : ""}`,
          date: i.issue_date ?? i.week_end,
          data: i,
        }));
        const staticItems = staticNewsletters.map((nl) => ({
          kind: "static" as const,
          id: `static-${nl.id}`,
          label: `${nl.date} · ${nl.title}`,
          date: nl.date,
          data: nl,
        }));
        const allItems = [...dbItems, ...staticItems].sort((a, b) =>
          (b.date ?? "").localeCompare(a.date ?? "")
        );

        const selectedKey = activeId
          ? activeId
          : staticOpenIds.size > 0
          ? `static-${Array.from(staticOpenIds)[0]}`
          : allItems[0]?.id ?? "";

        const selected = allItems.find((it) => it.id === selectedKey) ?? allItems[0];

        const handleSelect = (val: string) => {
          if (val.startsWith("static-")) {
            const sid = Number(val.replace("static-", ""));
            setActiveId(null);
            setStaticOpenIds(new Set([sid]));
          } else {
            setActiveId(val);
            setStaticOpenIds(new Set());
          }
        };

        return (
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h2 className="text-sm font-bold tracking-widest uppercase text-foreground">
                지난 뉴스레터 아카이브
              </h2>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-semibold">
                {allItems.length}건
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={selected?.id ?? ""} onValueChange={handleSelect}>
                  <SelectTrigger className="h-8 text-xs w-[320px] bg-card">
                    <SelectValue placeholder="발행일을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {allItems.map((it) => (
                      <SelectItem key={it.id} value={it.id} className="text-xs">
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selected?.kind === "db" && (
              <Card className="border border-primary/40 bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">{selected.data.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {selected.data.week_start} ~ {selected.data.week_end}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">
                          {selected.data.total_reviews?.toLocaleString()}건
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">
                          {selected.data.countries_count}개국
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            selected.data.avg_sentiment >= 80 ? "text-green-600 border-green-200"
                            : selected.data.avg_sentiment >= 65 ? "text-amber-600 border-amber-200"
                            : "text-red-600 border-red-200"
                          }`}
                        >
                          감성 {selected.data.avg_sentiment}점
                        </Badge>
                      </div>
                    </div>
                    <Badge className={`text-[9px] ${
                      selected.data.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {selected.data.status === "published" ? "발행됨" : "초안"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3">
                    선택한 이슈가 상단 미리보기에 반영됩니다.
                  </p>
                </CardContent>
              </Card>
            )}

            {selected?.kind === "static" && (
              <Card className="border border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {selected.data.id}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-foreground">{selected.data.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{selected.data.date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{selected.data.summary}</p>
                      <div className="border-t border-border mt-3 pt-3">
                        <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-[Inter,sans-serif]">
                          {selected.data.content}
                        </pre>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!selected && (
              <p className="text-xs text-muted-foreground">아카이브에 표시할 이슈가 없습니다.</p>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default NewsletterPage;
