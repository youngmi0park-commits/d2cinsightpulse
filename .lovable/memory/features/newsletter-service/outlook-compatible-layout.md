---
name: Newsletter Layout
description: Outlook-safe weekly newsletter layout with main-dashboard-aligned LG.com×Reddit insights, Inter+Noto Sans KR fonts, 16 placeholder tokens
type: feature
---

뉴스레터 페이지(`/newsletter`)는 동적 HTML 미리보기 iframe을 메인 우선 영역으로 배치합니다. 템플릿 `public/newsletter-template.html`은 Outlook 호환(table-only, inline style, 6-digit hex, no border-radius/box-shadow on layout)이며 16개 `{{PLACEHOLDER}}` 토큰을 사용합니다.

**레이아웃 (위→아래, 압축형):**
1. Red accent bar (5px #C8102E)
2. HEADER — 로고 + WEEKLY REPORT 박스 ({{WEEK_START}}~{{WEEK_END}})
3. KPI 4분할 — 총 리뷰/국가/활성 채널/긍정 TOP 키워드
4. 채널 수집 pill — LG.com / Reddit / YouTube / Trustpilot / +Other
5. **LG.com × Reddit 2-칼럼 인사이트** — 메인 대시보드(OverviewDashboard)의 `generate-overview-summary` 결과(top_topics 3건 + urgent_issues 2건 + key_takeaway 1건)를 그대로 표시
6. 주간 언급 TOP 제품 박스
7. 마케터 액션 가이드 (4-step 정적 안내)
8. Footer

**데이터 동기화:**
- `generate-newsletter` Edge Function이 LG.com / Reddit 두 채널에 대해 `generate-overview-summary`를 병렬 호출하여 결과를 `newsletter_issues.lgcom_overview` / `reddit_overview` (jsonb)에 저장합니다.
- 메인 대시보드와 뉴스레터가 동일한 주간 인사이트 페이로드를 사용합니다.
- `NewsletterPage.tsx`의 `fillTemplate()`이 16개 placeholder + 2개 인사이트 HTML 블록을 클라이언트에서 치환하여 iframe `srcDoc`에 주입합니다.

**폰트:** 모든 셀에 `font-family: Inter, 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', Arial, sans-serif` 명시 — 대시보드와 동일.
