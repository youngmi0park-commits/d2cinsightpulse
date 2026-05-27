---
name: ABSA Sentiment Classification
description: Bazaarvoice ABSA를 1차 기준으로 opinion-level 분류, 이중 카운트, percentPositive·feature_score·baseline·min 10 reviews 규칙
type: feature
---

리뷰 긍/부정 분류는 **Aspect-Based Sentiment Analysis (ABSA)** 기준 적용.

1. Opinion 단위로 쪼개 (feature, opinion_word, modifier) 추출 → 각 opinion에 -1/0/+1 부여.
2. 규칙: positive+negation=부정, negative+negation=긍정, 이중부정=긍정. "less wait"=긍정, "more wait"=부정. "rust/mold/leak" 같은 undesirable outcome은 키워드 없이도 부정.
3. 한 리뷰가 positive/negative 카운트에 **동시에 기여 가능**(화질+/음질-).
4. Feature 지표:
   - `percentPositive` 0.0~1.0 (feature별 positive 비율)
   - `feature_score = percentPositive * log10(n+10)/log10(maxN+10)` — 볼륨 가중.
   - `baseline_sentiment` -1/0/+1 (오분류 시 수동 보정)
5. **최소 10건 displayable reviews 미만 제품은 sentiment 분석 제외**, UI에 "Insufficient data" 표시.
6. LLM 기반 파이프라인은 v2 로드맵(timeline 미정) — explicit confidence + configurable similarity threshold 도입 예정.

문서: mem://technical/sentiment-engine-spec/absa-classification (+ Skill 4 SKILL.md §3.0/3.4).
