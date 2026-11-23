# Bazaarvoice hold
- [x] Disable all Bazaarvoice scheduled jobs (5 confirmed inactive).
- [x] Remove all 15 Bazaarvoice API credentials from the project.
- [x] Block every Bazaarvoice API entry point and collection control (8 endpoints deployed).
- [x] Test deployed hold responses and preserve existing reviews (8 live hold responses; 3 policy tests passed; no review data changed).

# Bazaarvoice data removal
- [ ] Delete Bazaarvoice-origin reviews and collection tracking while retaining crawled reviews.
- [ ] Remove Bazaarvoice-only cached analytics without deleting unrelated data.
- [ ] Restore the legacy collector as a crawl-only path; keep all API collectors held.
- [ ] Verify deletion counts, retained data, and crawl-only behavior.