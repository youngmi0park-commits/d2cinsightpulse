
User wants: wrap the top section of the newsletter (header + intro + 데이터 수집 현황 + 4 KPI cards, down to just before 마케팅 기회 매트릭스) in a warm gray bordered box, with the outer page background changed to white for contrast.

Looking at the screenshot: the area to wrap includes the header (Review-to-Asset Studio + Weekly Report badge), the tagline, the "데이터 수집 현황" panel with channel chips, and the 4 KPI cards row.

Need to inspect current `serve-newsletter/index.ts` to find:
- Outer body/wrapper background color (currently warm beige #EFECE5 likely)
- Header section structure
- KPI cards section structure
- Where 마케팅 기회 매트릭스 starts (this is the boundary)

Will change:
1. Outer page bg → white (#ffffff)
2. Wrap header → KPI row in a single warm gray bordered container (border: 1px solid warm gray like #E5E0D5, bg: #FAF8F3 warm gray-beige tint, rounded corners, padding)
3. Sections after (마케팅 기회 매트릭스 onward) remain as-is on white background

## Plan

**File**: `supabase/functions/serve-newsletter/index.ts`

1. Change outer email background from beige to white (`#ffffff`)
2. Wrap the top block (header + intro + 데이터 수집 현황 + KPI 4-card row) inside a single Outlook-safe table with:
   - Border: `1px solid #E5DFD3` (warm gray)
   - Background: `#FAF7F0` (light warm gray/cream)
   - Rounded look via padding (Outlook ignores border-radius but we'll add it for modern clients)
   - Padding: 24px
3. Sections from 마케팅 기회 매트릭스 downward sit directly on the white outer background (no wrapping change)
4. Re-deploy `serve-newsletter` edge function
5. Verify in preview iframe (user can refresh)

No DB or schema changes. No prompt changes. Pure layout/CSS refinement in the HTML renderer.
