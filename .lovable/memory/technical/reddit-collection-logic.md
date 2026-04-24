---
name: Reddit 수집 v3 — Adaptive Scheduler
description: collect-reddit Edge Function의 4단계 폴백 전략(Firecrawl→Reddit JSON→old.reddit→Bing)과 직접 서브레딧 하베스트
type: feature
---
collect-reddit Edge Function은 insane-search 철학을 차용한 4단계 적응형 스케줄러로 운영됩니다:
- **Phase 0**: Firecrawl `/v1/search` (Google 기반)
- **Phase 1**: Reddit 공식 `.json` 엔드포인트 — `search.json`(쿼리) 및 `r/<sub>/hot.json`(직접 하베스트)
- **Phase 1c**: 개별 포스트 `comments.json` 깊이 수집 (deepComments=true 기본)
- **Phase 2**: old.reddit.com URL 변환 후 Firecrawl 재시도
- **Phase 3**: Bing 우회 검색 (`<query> reddit`)

**Phase 1d (YARS-style)**: 키리스 멀티-리스팅 하베스트 — 서브레딧당 hot/new/top/rising 4개 리스팅을 순회하며 URL 기준 dedupe (참고: github.com/datavorous/yars). `yarsHarvest=true` 기본.
**URS-style 옵션**: `searchSort` (relevance/new/top/hot/comments)와 `searchTimeFilter` (hour/day/week/month/year/all)로 Reddit 검색 결과 정렬·시간창 제어 (참고: github.com/JosephLai241/URS).

각 단계별 수집 건수는 응답의 `phase_stats`로 반환됩니다. 카테고리당 최대 쿼리 15개, 13개 핵심 서브레딧을 항상 직접 수집(includeDirectSubs 기본 true). UA 풀 7종 랜덤 로테이션. 호출 예: `{ mode, category, deepComments, maxQueries, includeDirectSubs, yarsHarvest, searchSort, searchTimeFilter }`.
