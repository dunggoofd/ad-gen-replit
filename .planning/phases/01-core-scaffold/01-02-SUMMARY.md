---
phase: 01-core-scaffold
plan: 02
subsystem: database
tags: [postgresql, pg, node, pool, schema, ddl]

requires: []
provides:
  - Shared pg.Pool instance exported as `pool` for all database modules
  - initDb() async startup function that verifies connectivity and creates clients table
  - SSL configuration pattern for Replit managed Postgres and Neon.tech
affects:
  - All future phases that require database access (02 onwards)
  - server.js bootstrap sequence

tech-stack:
  added: [pg (node-postgres)]
  patterns:
    - Shared pool singleton — all modules import { pool } from '../database/init'
    - DATABASE_URL presence as SSL gate (not NODE_ENV)
    - pool.on('error') listener to prevent idle-client crash

key-files:
  created: [database/init.js]
  modified: []

key-decisions:
  - "SSL configured on DATABASE_URL presence (not NODE_ENV) — handles both Replit managed Postgres and Neon.tech which use self-signed/hosted certs"
  - "client.release() placed in finally block to prevent pool exhaustion on query errors"
  - "SELECT NOW() as connectivity probe — cheap, read-only, always available"

patterns-established:
  - "Pool singleton: create once in database/init.js, import everywhere else"
  - "initDb() pattern: probe connectivity first, then run DDL idempotently"

requirements-completed: [SCAF-03]

duration: 1min
completed: 2026-03-02
---

# Phase 1 Plan 02: Database Init Summary

**Shared pg.Pool singleton with SSL auto-detection and idempotent clients table DDL via initDb()**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-02T09:51:31Z
- **Completed:** 2026-03-02T09:52:17Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `database/init.js` with shared pg.Pool for use by all database modules
- SSL configured using DATABASE_URL presence as the gate (works for Replit Postgres and Neon.tech)
- pool.on('error') listener prevents idle-client errors from crashing Node
- initDb() probes connectivity with SELECT NOW() before running DDL
- clients table created idempotently via CREATE TABLE IF NOT EXISTS

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database/init.js with pg Pool and initDb()** - `92af04d` (feat)

**Plan metadata:** `[tbd]` (docs: complete plan)

## Files Created/Modified
- `database/init.js` - Shared pg.Pool export and initDb() startup function; creates clients table

## Decisions Made
- SSL uses DATABASE_URL presence as the gate, not NODE_ENV. This correctly handles Replit managed Postgres and Neon.tech (both use self-signed or hosted certs) while allowing local dev without SSL when DATABASE_URL is absent.
- client.release() is placed in a finally block to guarantee pool client is returned even if queries throw.
- Phase 2 (plan 02-01) will add all remaining tables to initDb() in this same file — the clients table is the first and will grow as phases are added.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before integration testing:**
- Add `DATABASE_URL` to Replit Secrets
  - Source: Replit workspace Tools > Secrets, OR Neon.tech dashboard > Connection Details
  - Format: `postgresql://user:password@host:5432/dbname`
- Either use Replit's built-in PostgreSQL or create a free Neon.tech database

## Next Phase Readiness
- database/init.js is ready — all future database modules can `const { pool } = require('../database/init')`
- server.js (plan 01-01) expects `const { initDb } = require('./database/init')` and `await initDb()` at startup
- Phase 2 (plan 02-01) will extend initDb() with additional CREATE TABLE IF NOT EXISTS statements for remaining tables

---
*Phase: 01-core-scaffold*
*Completed: 2026-03-02*
