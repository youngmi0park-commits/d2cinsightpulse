---
name: Sentiment Engine v2 Roadmap
description: Multilingual lexicon (DE/FR/ES), competitor vs-comparison flag, and 6-emotion classifier (Beta) on src/lib/sentiment.ts SentimentResult
type: feature
---

src/lib/sentiment.ts SentimentResult now exposes three v2 fields:

1. competitorComparisons: CompetitorComparisonFlag[] — explicit "vs Samsung", "than Sony", "compared to TCL" detection across EN/DE/FR/ES. Each flag has brand, maskedBrand (SS/SN/C브랜드/기타), trigger, outcome (win/loss/neutral), evidence sentence. Always render maskedBrand in user-facing UI.

2. emotions: EmotionDistribution (Beta) — rule-based classifier for 6 emotions: satisfaction(만족) / disappointment(실망) / expectation(기대) / anxiety(불안) / anger(분노) / trust(신뢰). Multilingual cue lexicon EN/KO/DE/FR/ES. Mark UI as "Beta"; LLM-backed upgrade due 8~9월.

3. detectedLanguages: string[] — heuristic ISO codes (en/de/fr/es/ko/ja).

POSITIVE_WORDS, NEGATIVE_WORDS, NEGATION_TOKENS extended with DE/FR/ES entries.

Roadmap: multilingual + competitor flag shipped (6~7월). 6-emotion v1 shipped as Beta (8~9월 milestone).
