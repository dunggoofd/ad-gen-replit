---
phase: 02-data-model-multi-tenancy
plan: 01
subsystem: database
tags: [postgresql, schema, migrations, multi-tenancy, fk-indexes]

# Dependency graph
requires:
  - phase: 01-core-scaffold
    provides: database/init.js with clients table and Pool setup
provides:
  - Full 7-table PostgreSQL schema with FK constraints and indexes created idempotently on startup
affects: [03, 04, 05, 06, 07, 08]

# Tech tracking
tech-stack:
  added: []
  patterns: [IF NOT EXISTS idempotent DDL, sequential client.query() calls inside pool.connect() client, FK ordering (parent tables first)]

key-files:
  created: []
  modified: [database/init.js]

key-decisions:
  - "All 6 new tables reference clients(id) ON DELETE CASCADE — deleting a client cascades cleanly"
  - "6 CREATE INDEX IF NOT EXISTS statements for all client_id FK columns — O(log n) lookups for per-client queries"
  - "clients table remains first in DDL sequence — FK ordering constraint"
  - "Single client connection executes all DDL sequentially — no transaction, but idempotency handles retries"

patterns-established:
  - "FK pattern: client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE on every tenant-scoped table"
  - "Index pattern: idx_{table}_client ON {table}(client_id) for all FK columns"

requirements-completed: [DATA-01]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 2 Plan 01: Full schema DDL with 7 tables and 6 FK indexes via IF NOT EXISTS

**PostgreSQL schema extended to 7 tables (clients + brand_kits, templates, assets, generations, brand_intelligence, campaigns) with ON DELETE CASCADE FKs and 6 client_id indexes, all idempotent**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-03T00:10:29Z
- **Completed:** 2026-03-03T00:13:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Extended initDb() with 6 additional CREATE TABLE IF NOT EXISTS statements in correct FK order
- Added ON DELETE CASCADE foreign keys to clients(id) on all 6 new tables
- Added 6 CREATE INDEX IF NOT EXISTS statements for all client_id FK columns
- Schema is fully idempotent — safe to re-run on startup with existing tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend initDb() with full schema — 6 tables + 6 indexes** - `9df3d8f` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `database/init.js` - Extended initDb() with brand_kits, templates, assets, generations, brand_intelligence, campaigns tables and 6 client_id indexes

## Decisions Made
- ON DELETE CASCADE on all FK constraints — deleting a client removes all their data automatically
- Indexes placed after all table DDL but before the `console.log('[db] Schema initialized')` line — clear separation of DDL phases
- No transaction wrapper — IF NOT EXISTS makes each statement safe to retry independently

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 tables will exist on next `npm start` after connecting to PostgreSQL
- Phases 3-8 can assume brand_kits, templates, assets, generations, brand_intelligence, and campaigns tables are present
- All client_id FK indexes ready for per-client query performance

---
*Phase: 02-data-model-multi-tenancy*
*Completed: 2026-03-03*
