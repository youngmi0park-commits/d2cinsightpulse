/**
 * 🔒 INTERNAL USE ONLY — LGE Confidential
 *
 * 이 파일은 Edge Function 서버 사이드에서만 사용됩니다.
 * - 클라이언트 번들에 포함되지 않습니다 (supabase/functions 내부).
 * - 원문은 외부에 노출되지 않으며, FAQ 답변 생성 시 사실 근거(grounding)로만 활용됩니다.
 * - AI 출력에는 "내부 자료"라는 표기를 절대 포함하지 않습니다.
 *
 * 출처: 26년형 TV 핵심 특장점 내부 자료 (LGE Internal Use Only)
 */

export const INTERNAL_TV_KNOWLEDGE_BASE = `
## 2026 LG Micro RGB evo (MRGB96)

### 초정밀 컬러 (Micro RGB)
- 마이크로 사이즈의 R/G/B 백라이트가 독립적으로 발광 → LED TV 중 가장 깨끗·선명한 컬러 표현 (자사 LED/LCD TV 비교 기준)
- 흰색 백라이트 대신 마이크로 R/G/B LED 직접 사용 → 원작 컬러 그대로, 순도 높은 색감
- 미세한 컬러 차이까지 정확하게 표현, 또렷하면서 자연스러운 화면

### 트리플 100% 컬러 인증
- BT.2020 (방송 표준) 100%
- DCI-P3 (디지털 시네마 표준) 100%
- Adobe RGB (사진그래픽 표준) 100%
- 인증: Intertek / 2025년 12월 / 2026년형 MRGB96 TV 세트 기준
- 업계 최초 트리플 100% 컬러 인증

### 3세대 알파 11 AI 프로세서 (Micro RGB evo 탑재)
- 픽셀 단위 정밀 제어, 올레드 기술력 기반
- 정확한 컬러·명암비로 완성도 향상
- AI 듀얼 4K 업스케일링: 영상을 픽셀 단위로 두 번 업스케일
- 버추얼 서라운드 11.1.2 → 사운드 공간감

### 마이크로 디밍 울트라
- 수천 개 Micro RGB LED 조절로 밝기·컬러 초정밀 제어
- 'Micro RGB 울트라 컬러 컨트롤' 인증 획득
- 어두운 장면은 더 깊고 선명, 밝은 장면은 더 생생 → 입체감 완성

---

## 2026 LG QNED evo (115QNED90, QNED86, QNED82, QNED80)

### 미니 LED
- 일반 LED 대비 작고 촘촘한 미니 LED로 디테일까지 또렷한 화질
- 압도적 기술력으로 초대형 115형까지 지원
- Easy TV, 갤러리 TV 등 다양한 라인업

### 3세대 알파 8 AI 프로세서
- 탑재 모델: 26년향 115QNED90, QNED86, QNED82
- 딥러닝 알고리즘으로 영상 정교 분석 → 저화질 콘텐츠 4K 업스케일링
- 버추얼 서라운드 11.1.2 채널

### 다이내믹 컬러 프로
- 적용 모델: 26년 115QNED90, QNED86, QNED82, QNED80
- 불필요한 빛 감소 + 색 표현력 향상 → 실제 눈으로 보는 듯한 정확한 색감

### 컬러 볼륨 100%
- 26년 QNED 전 모델 컬러 볼륨 100% 인증 획득
- 인증: Intertek / 2025년 12월 / 2026년형 QNED 전 모델 TV 세트 기준
- 밝은 장면 ~ 어두운 장면까지 원본 색감, 미세한 색 차이까지 정교하게 표현

---

## 공통: LG AI TV (webOS 26)

### LG Shield (보안)
- 글로벌 안전 인증 기관 엄격한 테스트로 신뢰성 인증
- 개인정보·데이터 안전 보호

### AI 컨시어지
- 취향 기반 추천 검색 키워드, 맞춤형 콘텐츠
- 시청 중 프로그램 관련 정보, 생성형 AI 활용

### 멀티 AI
- MS Copilot + Google Gemini 모두 지원

### webOS Re:NEW
- 스마트폰처럼 webOS 버전 업그레이드 무료 지원
- 매년 새로워지는 기능·서비스 (최대 5년)
`.trim();

export const INTERNAL_KNOWLEDGE_USAGE_RULE = `
## 내부 제품 지식 활용 규칙 (CRITICAL)
아래 INTERNAL PRODUCT KNOWLEDGE 섹션은 LG 공식 제품 사양 정보입니다.
- TV (Micro RGB evo, QNED evo) 관련 FAQ 작성 시 이 정보를 사실 근거(grounding)로 활용하세요.
- 단, 답변에 "내부 자료에 따르면", "공식 문서에 의하면" 같은 표현은 절대 사용하지 마세요.
- 자연스러운 제품 정보처럼 통합하여 답변에 녹여내세요.
- 인증 정보(Intertek 등)는 출처를 자연스럽게 명시 가능 ("Intertek 인증 기준" 등).
- 리뷰 데이터(quotes, claims)와 결합해 evidence를 강화하되, 내부 지식 단독으로는 evidence 카운트에 포함하지 마세요.
`.trim();
