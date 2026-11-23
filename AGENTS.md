# Architecture rules
- Bazaarvoice-capable endpoints must return the shared hold response before credentials, database writes, or outbound calls; credential restoration alone must never resume a held integration.
- Collection controls use the frontend Bazaarvoice policy to block held channels while keeping unrelated collectors available.
- The LG.com direct collector is crawl-only and records `lge_com_direct` logs; it must never read Bazaarvoice credentials or use a review API fallback.
- Identify legacy Bazaarvoice reviews by `bv_` external IDs or `bazaarvoice:` source URLs, not country/source labels, to preserve independently crawled reviews during removal.
- Preserve the migration tool's Drizzle journal and configuration for schedule changes so the applied database state remains reproducible.