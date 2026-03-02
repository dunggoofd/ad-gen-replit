# Roadmap: Static Ads Generator

## Overview

Eight phases take the project from a bare Express skeleton to a fully deployed Replit app that generates on-brand Meta static ads via FAL.ai, manages multi-tenant client workspaces, and runs profile-first campaign batch jobs. Each phase is independently deployable and testable on Replit.

## Phases

- [x] **Phase 1: Core Scaffold** - Working Express server, health endpoint, Tailwind UI shell, Replit config
- [x] **Phase 2: Data Model & Multi-tenancy** - Full PostgreSQL schema, clientScope middleware, default-client fallback (completed 2026-03-02)
- [x] **Phase 3: Client & Brand Kit** - Client CRUD, brand kit upsert, logo uploads, brand setup UI with autosave (completed 2026-03-02)
- [ ] **Phase 4: Template & Asset Library** - Template CRUD, save-as-template, multi-file asset upload, categorization modal
- [ ] **Phase 5: AI Image Generation** - FAL integration, generate endpoint, history persistence, visual board
- [ ] **Phase 6: Prompt Intelligence** - Re-prompt, brand intelligence, Gemini wrapper, prompt compose + fallback
- [ ] **Phase 7: Reverse Engineering & Concepts** - Winning-ad reverse engineer, concepts endpoint, modals
- [ ] **Phase 8: Campaign Builder** - Campaign planning, batch generation, builder UX, production hardening

## Phase Details

### Phase 1: Core Scaffold
**Goal**: Working Express server with DB connection, health endpoint, static file serving, and Replit deployment config
**Depends on**: Nothing
**Requirements**: SCAF-01, SCAF-02, SCAF-03
**Success Criteria** (what must be TRUE):
  1. `npm start` launches without error and logs port + DB status
  2. `GET /api/health` returns `{ status: "ok", uptime: N }`
  3. Browser loads `views/index.html` with Tailwind styles applied
  4. `.replit` and `replit.nix` present; app runs on Replit Deploy
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Express server, middleware stack, Tailwind HTML shell, static serving, Replit config files
- [x] 01-02-PLAN.md — database/init.js with pg Pool, initDb() connectivity probe, clients table DDL skeleton

### Phase 2: Data Model & Multi-tenancy
**Goal**: Full database schema live on startup; every table, index, and constraint created idempotently; clientScope middleware attached to all per-client routes
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. All tables exist after fresh `npm start` with empty DB
  2. `X-Client-Id` header, cookie, and fallback all correctly resolve `req.clientId`
  3. Request without any client data returns 503 with clear message
  4. Re-running `npm start` with existing tables produces no errors
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Full schema in database/init.js (all tables, indexes, constraints)
- [ ] 02-02-PLAN.md — database/clients.js queries + middleware/clientScope.js + server.js import

### Phase 3: Client & Brand Kit
**Goal**: Full client workspace management with brand kit CRUD, logo uploads, and a polished two-tab Brand Setup UI with autosave
**Depends on**: Phase 2
**Requirements**: CLNT-01, CLNT-02, CLNT-03, CLNT-04
**Success Criteria** (what must be TRUE):
  1. Can create, rename, and delete a client via UI; last workspace deletion is refused
  2. Brand kit colors, fonts, tone, and tagline save and reload correctly
  3. Logo upload (light/dark/icon) stores file, updates DB, and previews in UI
  4. Autosave fires after typing and shows Saving → Saved status
  5. Live preview card updates as user edits brand fields
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — database/clients.js full CRUD + routes/clients.js + server.js mount
- [ ] 03-02-PLAN.md — database/brandKits.js + middleware/upload.js (multer) + routes/brandKit.js + server.js mount
- [ ] 03-03-PLAN.md — Brand Setup UI in views/index.html (two-tab, color pickers, autosave, live preview, logo upload)

### Phase 4: Template & Asset Library
**Goal**: Template library with thumbnail support, favorite toggle, and save-as-winner; brand asset media library with multi-upload and post-upload categorization
**Depends on**: Phase 3
**Requirements**: TMPL-01, TMPL-02, ASST-01, ASST-02
**Success Criteria** (what must be TRUE):
  1. Can create, list, filter, favorite, and delete templates with thumbnails
  2. Generation image can be promoted to template library as a winner
  3. Can upload up to 10 asset files at once; each stored with category
  4. Categorization modal appears after upload and saves category to each asset
  5. Assets filterable by category, tags, and search in UI
**Plans**: TBD

Plans:
- [ ] 04-01: routes/templates.js + database/templates.js (CRUD, thumbnail, favorite, save-as-template)
- [ ] 04-02: routes/assets.js + database/assets.js (multi-upload, categoryFromMime, bulk delete)
- [ ] 04-03: Template Library UI + Asset Library UI + categorization modal in index.html

### Phase 5: AI Image Generation
**Goal**: FAL.ai integrated end-to-end; single ad generation endpoint live; generation history persisted; visual history board renders with loading and failure states
**Depends on**: Phase 4
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04
**Success Criteria** (what must be TRUE):
  1. `POST /api/generate` returns a valid image URL from FAL
  2. Generation record (prompt, result, brand snapshot) saved to DB
  3. History board displays past generations in a grid
  4. Loading spinner shown while generation is in flight
  5. Failed generations show error state, not blank cards
**Plans**: TBD

Plans:
- [ ] 05-01: services/fal.js wrapper + POST /api/generate endpoint + database/generations.js
- [ ] 05-02: Visual history board UI in index.html (grid, loading, failure, image preview)

### Phase 6: Prompt Intelligence
**Goal**: Re-prompt variations, brand intelligence CRUD with UI editor, Gemini wrapper, prompt composition from strategy + assets, deterministic fallback
**Depends on**: Phase 5
**Requirements**: PRMT-01, PRMT-02, PRMT-03, PRMT-04, PRMT-05, PRMT-06
**Success Criteria** (what must be TRUE):
  1. `POST /api/generate/edit` returns a variation of an existing generation
  2. Brand intelligence can be generated from brand kit and edited in UI
  3. All Gemini calls go through `services/gemini.js`
  4. `POST /api/generate/compose` assembles and returns a full prompt
  5. Fallback prompt composes correctly from raw brand kit when Gemini is unavailable
**Plans**: TBD

Plans:
- [ ] 06-01: services/gemini.js wrapper + POST /api/generate/edit
- [ ] 06-02: routes/brandIntelligence.js + database/brandIntelligence.js + Brand Intelligence UI
- [ ] 06-03: services/promptCompose.js + POST /api/generate/compose + fallback logic

### Phase 7: Reverse Engineering & Concepts
**Goal**: Winning ad image analyzed by Gemini to extract strategy; concept directions generated from brand context; both backed by UI modals
**Depends on**: Phase 6
**Requirements**: PRMT-07, PRMT-08, PRMT-09
**Success Criteria** (what must be TRUE):
  1. `POST /api/generate/reverse` returns strategy JSON from an ad image URL
  2. Reverse Engineer modal displays extracted strategy with actionable buttons
  3. `POST /api/generate/concepts` returns N concept direction objects
  4. Concepts displayed in UI for selection before generation
**Plans**: TBD

Plans:
- [ ] 07-01: POST /api/generate/reverse endpoint + Reverse Engineer modal
- [ ] 07-02: POST /api/generate/concepts endpoint + Concepts selection UI

### Phase 8: Campaign Builder
**Goal**: Profile-first campaign planning, batch generation with per-item progress, multi-step builder UX, and full production hardening for Replit
**Depends on**: Phase 7
**Requirements**: CAMP-01, CAMP-02, CAMP-03, OPS-01
**Success Criteria** (what must be TRUE):
  1. Campaign plan endpoint returns structured plan from objective + audience + budget
  2. Batch generation runs all campaign ads with live progress per item
  3. Campaign builder UX steps through Plan → Review → Generate → Results
  4. Upload validation rejects oversized/wrong-type files with clear errors
  5. Server starts cleanly with missing optional env vars (FAL, Gemini) with warnings
**Plans**: TBD

Plans:
- [ ] 08-01: routes/campaigns.js + database/campaigns.js + POST /api/campaigns/plan
- [ ] 08-02: Batch generation endpoint with progress tracking
- [ ] 08-03: Campaign builder UX in index.html (step flow)
- [ ] 08-04: Production hardening (upload validation, file path security, env var checks, README)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Scaffold | 2/2 | Complete | 2026-03-02 |
| 2. Data Model & Multi-tenancy | 2/2 | Complete   | 2026-03-02 |
| 3. Client & Brand Kit | 3/3 | Complete   | 2026-03-02 |
| 4. Template & Asset Library | 0/3 | Not started | - |
| 5. AI Image Generation | 0/2 | Not started | - |
| 6. Prompt Intelligence | 0/3 | Not started | - |
| 7. Reverse Engineering & Concepts | 0/2 | Not started | - |
| 8. Campaign Builder | 0/4 | Not started | - |
