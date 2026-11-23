# Bazaarvoice hold
- [x] Disable all Bazaarvoice scheduled jobs (5 confirmed inactive).
- [x] Remove all 15 Bazaarvoice API credentials from the project.
- [x] Block every Bazaarvoice API entry point and collection control (8 endpoints deployed).
- [x] Test deployed hold responses and preserve existing reviews (8 live hold responses; 3 policy tests passed; no review data changed).

# Bazaarvoice data removal
- [x] Delete 325,519 Bazaarvoice reviews, 10,350 BV-only products, 9,681 progress rows, 59 runs, and 7,156 hybrid/BV logs; preserve 5,502 independently collected reviews.
- [x] Clear LG.com cached analytics and mixed newsletter analysis; preserve unrelated sources and the separate Reddit overview.
- [x] Restore the legacy collector as a crawl-only path; keep all API collectors held.
- [x] Verify zero remaining BV reviews, 4 passing tests, a completed crawl collecting 4 reviews, and the dashboard showing retained US crawl data (17 region-tagged reviews).