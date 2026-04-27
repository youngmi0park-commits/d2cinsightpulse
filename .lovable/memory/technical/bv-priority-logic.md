---
name: bv-priority-logic
description: BV 우선순위 RPC와 미국 후순위 정책으로, 최근 3년 이내 출시 제품을 비미국 국가부터 우선 수집
type: feature
---
Bazaarvoice 수집 엔진(`get_bv_priority_products` RPC + `bv-auto-collect`)은 다음 우선순위로 동작합니다:

1. **출시 시점 필터**: 제품의 BV 첫 리뷰 시점(`MIN(published_at)`)이 최근 3년 이내인 제품만 수집 대상. 신규 등록되어 아직 첫 리뷰가 없는 제품도 포함.
2. **국가 순서**: 가장 오래 수집되지 않은 로캘 우선 + **`en_US`(미국)는 항상 마지막**으로 정렬 → 미국 외 국가(UK/IN/TW/JP/TH/DE/AU/BR) 우선 강화.
3. **카테고리 우선**: 냉장고/세탁기/건조기 → 식기세척기/청소기/에어컨 → 키친 → 기타 → TV/오디오/모니터(후순위).
