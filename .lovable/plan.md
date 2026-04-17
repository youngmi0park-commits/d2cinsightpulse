
## 개선된 주간 뉴스레터 시스템 구현 계획

### 목표
Outlook-safe + 마케터 액션 중심으로 주간 뉴스레터를 재설계하고, 실데이터를 자동 치환합니다.

### 작업 범위 (4 영역)

**1. `public/newsletter-template.html` — 전면 재디자인**

기존 457줄 템플릿을 Outlook-safe 단일 칼럼 마케터 액션 레이아웃으로 새로 작성합니다.

레이아웃 구조 (위→아래):
```text
┌────────────────────────────────────────┐
│ ① RED ACCENT BAR (5px #C8102E)         │
│ ② HEADER: 로고 + 주간 날짜 박스         │
│   {{WEEK_START}} ~ {{WEEK_END}}        │
│ ③ KPI 4분할 (table cellpadding)        │
│   • 총 리뷰 {{TOTAL_REVIEWS}}          │
│     {{REVIEW_DELTA}}                    │
│   • 국가 {{COUNTRY_COUNT}}             │
│   • 채널 {{ACTIVE_CHANNELS}}/43        │
│   • 평균 감성 (현재 issue 데이터)       │
│ ④ 채널별 수집 카드 (5칸)                │
│   LG.com / Reddit / YouTube /          │
│   Trustpilot / Other                    │
│ ⑤ 주간 시그널 박스                      │
│   • 긍정 TOP 키워드 + 카운트            │
│   • 언급 TOP 제품 + 카운트              │
│ ⑥ 마케터 액션 가이드 (정적 안내)        │
│ ⑦ FOOTER (RTA Studio 브랜딩)            │
└────────────────────────────────────────┘
```

준수 규칙 (Outlook 호환):
- `<table>` only — div/flex/grid 금지
- 모든 스타일 inline `style=""` only
- 6자리 hex만 (#C8102E, #EFECE5, #00B67A, #FF4500, #FF0000)
- border-radius/box-shadow는 레이아웃 table에 미사용
- MSO conditional comments + VML namespace 유지
- 폰트: Inter, Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, Arial

16개 `{{PLACEHOLDER}}` 토큰 모두 적절한 위치에 삽입.

**2. `src/pages/NewsletterPage.tsx` — 플레이스홀더 치환 + Outlook 복사 강화**

- `fillTemplate(html, issueData)` 헬퍼 추가 — 16개 토큰 정규식 치환
- `useQuery` 로 `newsletter_collection_stats` 조회 (lgcom/reddit/youtube/trustpilot 카운트 추출)
- `useEffect` 로 currentIssue + collectionStats 변경 시 `fetch("/newsletter-template.html")` → 치환 → `setFilledHtml`
- iframe 은 `srcDoc={filledHtml}` 로 전환 (정적 fallback 유지)
- `handleCopyForOutlook` 는 `filledHtml` 우선 사용, MSO 래퍼는 기존 로직 유지
- 기존 PageHeader / 정적 아카이브 / Collapsible UI는 그대로 보존

**3. `newsletter_issues` 테이블 — 컬럼 10개 추가 (마이그레이션)**

```sql
alter table newsletter_issues
  add column if not exists review_delta        text,
  add column if not exists top_positive_kw     text,
  add column if not exists top_positive_count  integer,
  add column if not exists top_product         text,
  add column if not exists top_product_count   integer,
  add column if not exists lgcom_count         integer,
  add column if not exists reddit_count        integer,
  add column if not exists youtube_count       integer,
  add column if not exists trustpilot_count    integer,
  add column if not exists other_channel_count integer;
```

**4. `supabase/functions/generate-newsletter/index.ts` — 데이터 채우기**

upsert 직전에 다음 계산 추가:
- 전주 issue 조회 → `reviewDelta` 문자열 ("▲ +12% vs 전주" / "▼ -28% vs 전주" / "변동없음")
- `bySource` 에서 lgcom/reddit/youtube/trustpilot 카운트 추출
- `otherChannelCount` = 그 외 source 종류 수
- 긍정 TOP 키워드: 기존 SQL 집계는 source/product/sentiment까지만 GROUP BY 하므로, **추가 SQL 1회**로 positive 리뷰 title 단어 빈도 집계 (간단 키워드 매칭 9개 — picture quality/excellent/great/amazing/perfect/love/fantastic/outstanding/best)
- 언급 TOP 제품: `productMap` + `byCountry.products` 합산해서 1위 추출
- upsert payload 에 10개 신규 필드 포함

**5. 배포 + 검증**

- `supabase--deploy_edge_functions(["generate-newsletter"])` 실행
- 마이그레이션 적용 (자동)
- Newsletter 페이지에서 AI 생성 → iframe 미리보기에 KPI/채널 카드/시그널 박스가 실데이터로 렌더되는지 확인

### 영향받는 파일
- `public/newsletter-template.html` (재작성)
- `src/pages/NewsletterPage.tsx` (수정)
- `supabase/functions/generate-newsletter/index.ts` (수정)
- `supabase/migrations/<timestamp>_newsletter_issues_kpi_columns.sql` (신규)

### 비파괴 보장
- `useNewsletterData.ts`, `serve-newsletter`, 기존 collection_stats / FAQ / signal 테이블 구조 미변경
- 정적 아카이브, Collapsible 동작, 페이지 라우트 그대로
- 6시간 cron / collect-reddit / Bazaarvoice 파이프라인에 영향 없음

### 메모리 업데이트
`mem://features/newsletter-service/outlook-compatible-layout` 갱신 — 16개 placeholder 토큰 + 마케터 액션 레이아웃 명세 반영
