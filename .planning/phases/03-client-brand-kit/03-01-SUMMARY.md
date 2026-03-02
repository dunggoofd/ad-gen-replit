---
phase: 03-client-brand-kit
plan: "03-01"
subsystem: client-api
tags: [express, database, crud, multi-tenancy, cookie]
dependency_graph:
  requires: [02-02]
  provides: [GET /api/clients, POST /api/clients, PATCH /api/clients/:id, DELETE /api/clients/:id]
  affects: [phase-03-brand-kit, phase-04-brand-assets, phase-05-ad-generation]
tech_stack:
  added: []
  patterns: [express-router, parameterized-queries, 409-last-resource-guard, cookie-set-on-create]
key_files:
  created:
    - routes/clients.js
  modified:
    - database/clients.js
    - server.js
decisions:
  - DELETE returns 409 (not 500) when last client — error thrown in DB layer with err.status=409
  - POST sets active_client_id cookie (httpOnly:false) so frontend can read it for workspace switching
  - /api/clients mounted without clientScope — list and create must work before any active client exists
  - clientsRouter mounted before /*splat wildcard per Express 5 route ordering requirements
metrics:
  duration: ~2 min
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_changed: 3
---

# Phase 03 Plan 01: Client CRUD API Summary

Full client CRUD REST API — list, create, rename, delete — with 409 guard on last-workspace delete and active_client_id cookie set on POST.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend database/clients.js with full CRUD queries | 8179851 | database/clients.js |
| 2 | Create routes/clients.js and mount in server.js | 8fbcfb3 | routes/clients.js, server.js |

## What Was Built

**database/clients.js** — Four new async query functions added alongside existing two:
- `listClients()`: SELECT all clients ORDER BY id ASC
- `createClient(name)`: INSERT RETURNING *
- `renameClient(id, name)`: UPDATE SET name WHERE id RETURNING *, returns null if not found
- `deleteClient(id)`: COUNT guard — throws err.status=409 if only 1 client; else DELETE

**routes/clients.js** — New Express Router with four endpoints:
- `GET /` — returns all clients as JSON array
- `POST /` — validates name, creates client, sets active_client_id cookie, returns 201 + client object
- `PATCH /:id` — renames client, returns 404 if not found
- `DELETE /:id` — deletes client, returns 204; error handler propagates 409 from DB layer

**server.js** — Added clientsRouter require and `app.use('/api/clients', clientsRouter)` before /api/health and before /*splat wildcard.

## Verification Results

- `node -e "const db = require('./database/clients'); console.log(Object.keys(db))"` → all 6 functions present
- `node -e "require('./routes/clients'); console.log('routes/clients ok')"` → exits 0
- server.js: `app.use('/api/clients', clientsRouter)` at line 21, `/*splat` at line 27

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- database/clients.js: EXISTS, exports 6 functions
- routes/clients.js: EXISTS
- server.js contains `app.use('/api/clients', clientsRouter)` before `/*splat`: CONFIRMED
- Commits 8179851 and 8fbcfb3: CONFIRMED
