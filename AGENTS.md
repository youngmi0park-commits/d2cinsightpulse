# Architecture rules
- Bazaarvoice-capable endpoints must return the shared hold response before credentials, database writes, or outbound calls; credential restoration alone must never resume a held integration.
- Collection controls use the frontend Bazaarvoice policy to block held channels while keeping unrelated collectors available.
- Preserve the migration tool's Drizzle journal and configuration for schedule changes so the applied database state remains reproducible.