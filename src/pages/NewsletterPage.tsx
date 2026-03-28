import { useState } from "react";
import { Mail, Send, Check, ChevronDown, ChevronUp, Calendar, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/PageHeader";

/* ─── Past Newsletters Archive ─── */
const newsletters = [
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
     - "picture quality", "brightness", "gaming performance" 키워드 집중
     - PDP 히어로 카피 및 SNS 콘텐츠 활용 권장

  2. LG 그램 Pro 17 — 신규 리뷰 유입 증가
     - "lightweight", "battery life", "display" 긍정 키워드 상위
     - 타겟: 비즈니스 프로페셔널 & 크리에이터

  3. Reddit 세탁기 카테고리 VOC 집중
     - "noise level", "vibration" 관련 불만 17건 감지
     - CRM 대응 및 FAQ 업데이트 필요

■ 감성 분석 요약
  - 전체 긍정률: 68.2% (전주 65.4% 대비 ↑2.8%p)
  - 부정 키워드 TOP 3: "price", "delivery delay", "app connectivity"
  - 긍정 키워드 TOP 3: "picture quality", "design", "easy setup"

■ 액션 아이템
  → OLED G6: 고객 추천 메시지 기반 Amazon A+ 콘텐츠 업데이트
  → 세탁기: 진동/소음 관련 FAQ 페이지 개선 및 CS 스크립트 보완
  → 그램 Pro: "가벼움 + 성능" 중심 퍼포먼스 마케팅 소재 제작`,
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
     - "value for money", "color accuracy", "slim design" 상위 키워드
     - 비교 검색 광고 소재 활용 가능

  2. LG 냉장고 InstaView — 기능 만족도 높음
     - "knock feature", "space", "energy efficient" 긍정 언급 다수
     - 라이프스타일 콘텐츠 (Reels/Shorts) 제작 권장

  3. 초기 부정 시그널 모니터링
     - "customer service response time" 관련 불만 8건
     - "app update frequency" 관련 개선 요청 5건

■ 감성 분석 요약
  - 전체 긍정률: 65.4%
  - 부정 키워드 TOP 3: "customer service", "app bugs", "price"
  - 긍정 키워드 TOP 3: "picture quality", "value", "design"

■ 향후 계획
  → 주간 자동 수집 파이프라인 안정화 완료
  → 카테고리별 심층 분석 리포트 2주차부터 제공 예정
  → Reddit VOC 버킷 분류 체계(REVIEW/VOC/QUESTION) 적용`,
  },
];

const NewsletterPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("유효한 이메일 주소를 입력해 주세요");
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubscribed(true);
    toast.success("뉴스레터 구독이 완료되었습니다! 매주 월요일 아침 리포트를 받아보세요.");
    setIsSubmitting(false);
  };

  const toggleOpen = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1000px] mx-auto overflow-y-auto h-[calc(100vh-2rem)]">
      <PageHeader
        icon={Mail}
        title="📮 Newsletter"
        description="주간 D2C Insight Pulse 뉴스레터를 구독하고, 지난 호의 인사이트 리포트를 아카이브에서 다시 확인할 수 있습니다."
      />
      <Card className="border border-border bg-card">
        <CardContent className="p-6">
          {isSubscribed ? (
            <div className="flex items-center gap-3 text-success">
              <div className="p-2 rounded-full bg-success/10">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">구독 완료!</p>
                <p className="text-sm text-muted-foreground">
                  매주 월요일 아침, <span className="text-foreground font-medium">{email}</span>로 리포트를 발송해 드립니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold">📬 위클리 리포트 뉴스레터</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                매주 월요일 아침, 주간 고객 보이스 리포트를 이메일로 받아보세요. 감성 분석 결과, 키워드 트렌드, 지역별 인사이트를 한눈에 확인할 수 있습니다.
              </p>
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 주소 입력"
                    className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-primary/30"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="h-12 px-6"
                >
                  {isSubmitting ? "구독 중..." : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      구독하기
                    </>
                  )}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-3">
                ※ 구독은 언제든 해지할 수 있으며, 스팸 메일을 발송하지 않습니다.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Past Newsletters Archive ─── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="text-sm font-bold tracking-widest uppercase text-foreground">
            지난 뉴스레터 아카이브
          </h2>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-semibold">
            {newsletters.length}건
          </Badge>
        </div>

        <div className="space-y-3">
          {newsletters.map((nl) => {
            const isOpen = openIds.has(nl.id);
            return (
              <Collapsible key={nl.id} open={isOpen} onOpenChange={() => toggleOpen(nl.id)}>
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
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                              {nl.summary}
                            </p>
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
    </div>
  );
};

export default NewsletterPage;
