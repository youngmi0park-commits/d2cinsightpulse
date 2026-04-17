

## Plan: 캠페인 컨텍스트 — 제품 카테고리 추가 & 예산등급 삭제

### 변경 사항

**`src/pages/ToolkitPage.tsx`**

1. **제품 카테고리 상수 추가**
   ```
   const PRODUCT_CATEGORIES = [
     "📺 TV", "🧊 냉장고 (Refrigerator)", "👕 세탁기 (Washer)",
     "🍳 식기세척기 (Dishwasher)", "💻 노트북 (Laptop)",
     "🖥️ 모니터 (Monitor)", "🔊 사운드바 (Soundbar)",
     "🌀 에어컨 (Air Care)", "🤖 청소기 (Vacuum)",
   ];
   ```

2. **예산 관련 코드 제거**
   - `BUDGET_TIERS` 상수 삭제 (lines 65-68)
   - `selectedBudget` state 삭제 (line 287)
   - CAMPAIGN SETUP 행에서 예산 드롭다운 제거 (line 357)
   - 전략 생성 프롬프트에서 budget 참조 제거 (line 474)

3. **제품 카테고리 드롭다운 추가**
   - `selectedCategory` state 추가
   - 캠페인 목표 옆(line 351)에 제품 카테고리 `SelectDropdown` 추가
   - 전략 생성 프롬프트에 카테고리 정보 포함

