import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Mail, Calendar, ChevronDown, ChevronUp, FileText, Loader2, Sparkles, ExternalLink, Copy, Archive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useNewsletterArchive,
  useNewsletterIssue,
  useCountrySignals,
  useChannelActions,
  useFaqItems,
  useCautionItems,
  useCollectionStats,
  useMatrixRows,
} from "@/hooks/useNewsletterData";
import { getLge, SIGNAL_TAG_COLOR, MATRIX_CELL_STYLE } from "@/constants/lgeSubsidiaries";
import type { SignalTag, MatrixCell } from "@/constants/lgeSubsidiaries";

/* ── Past Newsletters Archive (static fallback) ── */
const staticNewsletters = [
  {
    id: 2,
    title: "D2C Insight Pulse Weekly #2",
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
    title: "D2C Insight Pulse Weekly #1",
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
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [staticOpenIds, setStaticOpenIds] = useState<Set<number>>(new Set());
  const [copying, setCopying] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [newsletterHtml, setNewsletterHtml] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);

  // Data hooks
  const { data: currentIssue, refetch: refetchIssue } = useNewsletterIssue(activeId);
  const { data: issues, refetch: refetchArchive } = useNewsletterArchive();
  const issueId = currentIssue?.id;
  const { data: signals } = useCountrySignals(issueId);
  const { data: actions } = useChannelActions(issueId);
  const { data: faqItems } = useFaqItems(issueId);
  const { data: cautions } = useCautionItems(issueId);
  const { data: stats } = useCollectionStats(issueId);
  const { data: matrix } = useMatrixRows(issueId);

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
            "text/plain": new Blob(["D2C Insight Pulse 주간 뉴스레터"], { type: "text/plain" }),
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

  const hasIssueData = !!currentIssue && !!signals?.length;

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
          onClick={() => setArchiveOpen(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Archive className="h-3.5 w-3.5" /> 아카이브
        </button>
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

      {/* ── AI Generated Content ── */}
      {hasIssueData && (
        <div className="space-y-4">
          {/* Issue summary */}
          <Card className="border-[#C8102E]/20 bg-gradient-to-r from-[#C8102E]/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#C8102E] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{currentIssue.title}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {currentIssue.week_start} ~ {currentIssue.week_end} · {currentIssue.total_reviews?.toLocaleString()}건 · {currentIssue.countries_count}개국 · 감성 {currentIssue.avg_sentiment}점
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {currentIssue.status === "published" ? "✅ 발행됨" : "📝 초안"}
                </Badge>
              </div>

              {/* Collection stats pills */}
              {stats?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {stats.map((s: any) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot_color }} />
                      {s.display_name} {s.review_count?.toLocaleString()}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Country Signals */}
          {signals?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-[#C8102E] rounded-full" />
                <h2 className="text-sm font-bold tracking-widest uppercase">🌍 국가별 마케팅 시그널</h2>
                <Badge variant="outline" className="text-[10px]">{signals.length}개국</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {signals.map((sig: any) => {
                  const meta = sig.meta;
                  const scoreColor = sig.sentiment_score >= 80 ? "text-green-600" : sig.sentiment_score >= 65 ? "text-amber-600" : "text-red-600";
                  return (
                    <Card key={sig.id} className="border-border hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{meta?.flag ?? "🌐"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold">{sig.subsidiary_code}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{meta?.country ?? sig.subsidiary_code}</p>
                          </div>
                          <span className={`text-sm font-bold ${scoreColor}`}>{sig.sentiment_score}점</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                          <span>📊 {sig.total_reviews}건</span>
                          <span className="text-green-600">+{sig.positive_count}</span>
                          <span className="text-red-600">-{sig.negative_count}</span>
                          <span>🏷 {sig.top_category}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-2">{sig.top_insight_ko}</p>
                        <div className="flex flex-wrap gap-1">
                          {(sig.signal_tags ?? []).map((tag: string, i: number) => {
                            const color = SIGNAL_TAG_COLOR[tag as SignalTag] ?? "amber";
                            const bgClass = color === "green" ? "bg-green-100 text-green-700"
                              : color === "red" ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700";
                            return (
                              <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${bgClass}`}>
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matrix */}
          {matrix?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-[#C8102E] rounded-full" />
                <h2 className="text-sm font-bold tracking-widest uppercase">📊 카테고리 × 국가 매트릭스</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2 font-bold border border-border">카테고리</th>
                      {signals?.slice(0, 8).map((s: any) => (
                        <th key={s.subsidiary_code} className="p-2 font-bold border border-border text-center">
                          {s.meta?.flag} {s.subsidiary_code.replace("LGE", "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row: any) => (
                      <tr key={row.id}>
                        <td className="p-2 font-medium border border-border">{row.category_name_en ?? row.category_name}</td>
                        {signals?.slice(0, 8).map((s: any) => {
                          const cell = (row.cells as Record<string, string>)?.[s.subsidiary_code] as MatrixCell ?? "NONE";
                          const style = MATRIX_CELL_STYLE[cell] ?? MATRIX_CELL_STYLE.NONE;
                          return (
                            <td
                              key={s.subsidiary_code}
                              className="p-1.5 text-center border border-border font-bold"
                              style={{ backgroundColor: style.bg, color: style.text }}
                            >
                              {style.labelEn}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Channel Actions */}
          {actions?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-[#C8102E] rounded-full" />
                <h2 className="text-sm font-bold tracking-widest uppercase">📢 채널 광고 액션</h2>
                <Badge variant="outline" className="text-[10px]">{actions.length}건</Badge>
              </div>
              <div className="space-y-2">
                {actions.map((a: any) => (
                  <Card key={a.id} className="border-border">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <Badge className="text-[9px] bg-[#C8102E] text-white shrink-0">{a.channel_type?.toUpperCase()}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">{a.action_title_ko}</p>
                          <p className="text-[10px] text-muted-foreground">{a.action_title_en}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {(a.target_codes ?? []).map((c: string) => {
                            const m = getLge(c);
                            return <span key={c} className="text-[10px]" title={c}>{m?.flag ?? c}</span>;
                          })}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-1">📋 {a.basis_ko}</p>
                      {a.copy_headline_ko && (
                        <p className="text-[10px] font-medium bg-muted/50 rounded px-2 py-1 mt-1">
                          💬 "{a.copy_headline_ko}"
                        </p>
                      )}
                      {a.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {a.tags.map((t: string, i: number) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Items */}
          {faqItems?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-[#C8102E] rounded-full" />
                <h2 className="text-sm font-bold tracking-widest uppercase">❓ FAQ 우선순위</h2>
                <Badge variant="outline" className="text-[10px]">{faqItems.length}건</Badge>
              </div>
              <div className="space-y-2">
                {faqItems.map((f: any) => {
                  const priorityColor = f.priority === "p0" ? "bg-red-100 text-red-700"
                    : f.priority === "p1" ? "bg-amber-100 text-amber-700"
                    : "bg-muted text-muted-foreground";
                  return (
                    <Card key={f.id} className="border-border">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`text-[9px] ${priorityColor}`}>
                            {f.priority?.toUpperCase()} · CIS {f.cis_score}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">{f.faq_type}</Badge>
                        </div>
                        <p className="text-xs font-bold mb-1">{f.question_ko}</p>
                        <p className="text-[10px] text-muted-foreground">{f.answer_ko}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Caution Items */}
          {cautions?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-red-500 rounded-full" />
                <h2 className="text-sm font-bold tracking-widest uppercase">⚠️ 집행 주의</h2>
              </div>
              <div className="space-y-2">
                {cautions.map((c: any) => (
                  <Card key={c.id} className="border-red-200 bg-red-50/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[9px] ${c.severity === "urgent" ? "bg-red-600 text-white" : "bg-amber-100 text-amber-700"}`}>
                          {c.severity === "urgent" ? "🚨 긴급" : "⚠️ 주의"}
                        </Badge>
                        <div className="flex gap-1">
                          {(c.target_codes ?? []).map((code: string) => {
                            const m = getLge(code);
                            return <span key={code} className="text-[10px]">{m?.flag ?? code}</span>;
                          })}
                        </div>
                      </div>
                      <p className="text-xs font-bold">{c.title_ko}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{c.body_ko}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* ── Static Archive ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="text-sm font-bold tracking-widest uppercase text-foreground">
            지난 뉴스레터 아카이브
          </h2>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-semibold">
            {(issues?.length ?? 0) + staticNewsletters.length}건
          </Badge>
        </div>

        <div className="space-y-3">
          {/* DB issues */}
          {issues?.map((issue: any) => (
            <Card
              key={issue.id}
              className={`border cursor-pointer hover:shadow-md transition-shadow ${
                activeId === issue.id ? "border-[#C8102E] bg-red-50/30" : "border-border"
              }`}
              onClick={() => setActiveId(issue.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{issue.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {issue.week_start} ~ {issue.week_end}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[9px]">
                        {issue.total_reviews?.toLocaleString()}건
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {issue.countries_count}개국
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          issue.avg_sentiment >= 80 ? "text-green-600 border-green-200"
                          : issue.avg_sentiment >= 65 ? "text-amber-600 border-amber-200"
                          : "text-red-600 border-red-200"
                        }`}
                      >
                        감성 {issue.avg_sentiment}점
                      </Badge>
                    </div>
                  </div>
                  <Badge className={`text-[9px] ${
                    issue.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {issue.status === "published" ? "발행됨" : "초안"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Static newsletters */}
          {staticNewsletters.map((nl) => {
            const isOpen = staticOpenIds.has(nl.id);
            return (
              <Collapsible key={nl.id} open={isOpen} onOpenChange={() => toggleStaticOpen(nl.id)}>
                <Card className="border border-border bg-card hover:shadow-md transition-shadow">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                            {nl.id}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-foreground">{nl.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{nl.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{nl.summary}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground ml-3 flex-shrink-0">
                          <FileText className="h-3.5 w-3.5" />
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="border-t border-border pt-4">
                        <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-[Inter,sans-serif]">
                          {nl.content}
                        </pre>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* ── Archive Slide-over ── */}
      {archiveOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 cursor-pointer" onClick={() => setArchiveOpen(false)} />
          <div className="w-[340px] bg-background h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-bold text-sm">📂 뉴스레터 아카이브</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">최근 30호 · AI 생성 리포트</p>
              </div>
              <button onClick={() => setArchiveOpen(false)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div
                onClick={() => { setActiveId(null); setArchiveOpen(false); }}
                className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/30 ${!activeId ? "border-[#C8102E] bg-red-50/30" : "border-border"}`}
              >
                <Badge className="text-[9px] bg-[#C8102E] text-white mb-1">최신호</Badge>
                <p className="text-xs font-bold">현재 뉴스레터 (template)</p>
              </div>
              {!issues?.length && (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-2xl mb-2">📊</p>
                  <p className="text-sm font-medium">생성된 리포트 없음</p>
                  <p className="text-xs mt-1">날짜 선택 후 ⚡ AI 생성을 눌러주세요.</p>
                </div>
              )}
              {issues?.map((issue: any) => (
                <div
                  key={issue.id}
                  onClick={() => { setActiveId(issue.id); setArchiveOpen(false); }}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/30 ${activeId === issue.id ? "border-[#C8102E] bg-red-50/30" : "border-border"}`}
                >
                  <p className="text-xs font-bold">{issue.title ?? "Weekly Report"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{issue.week_start} ~ {issue.week_end}</p>
                  <div className="flex gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[9px]">{issue.total_reviews?.toLocaleString()}건</Badge>
                    <Badge variant="outline" className="text-[9px]">{issue.countries_count}개국</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterPage;
