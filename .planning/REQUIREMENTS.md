# Requirements: Static Ads Generator

**Defined:** 2026-03-02
**Core Value:** Generate on-brand Meta static ad creatives using AI with a full brand management system

## v1 Requirements

### Scaffold

- [x] **SCAF-01**: Node/Express monolith runs with `npm start`, serves `views/index.html`, loads Tailwind via CDN
- [x] **SCAF-02**: Baseline middleware wired (JSON, cookies, static, CORS), `GET /api/health` returns 200 with uptime
- [x] **SCAF-03**: PostgreSQL connects on startup, `database/init.js` runs all `CREATE TABLE IF NOT EXISTS` idempotently

### Data Model

- [ ] **DATA-01**: All tables exist with correct columns, indexes, and constraints (clients, brand_kits, templates, assets, generations, brand_intelligence, campaigns)
- [x] **DATA-02**: `clientScope` middleware resolves active client via header → cookie → fallback; all per-client routes enforce it

### Client & Brand Kit

- [ ] **CLNT-01**: Full client CRUD — create, list, get, rename, delete; delete refuses if last workspace
- [ ] **CLNT-02**: Brand Kit CRUD — upsert colors (primary/secondary/accent), fonts, tone of voice, tagline
- [ ] **CLNT-03**: Logo upload — light/dark/icon variants via Multer; `DELETE` clears field and removes file
- [ ] **CLNT-04**: Brand Setup UI — two-tab card (Brand Kit / Brand Assets), autosave on change, live preview card

### Templates

- [ ] **TMPL-01**: Template Library backend — CRUD, thumbnail upload, `is_favorite` toggle, tags filter, `source_type` (starter/user/winner)
- [ ] **TMPL-02**: Save-as-Template from generation — copies/downloads image, creates winner template record

### Assets

- [ ] **ASST-01**: Brand Assets backend — multi-file upload (≤10), list/search/filter by category/tags, PATCH, single/bulk delete
- [ ] **ASST-02**: Post-upload categorization UI — modal prompts user to label each uploaded asset (Product, Packaging, Lifestyle, Logo, Other)

### Generation

- [ ] **GEN-01**: FAL.ai integration — authenticated requests, resilient error handling, returns image URL
- [ ] **GEN-02**: `POST /api/generate` — accepts prompt + brand context, calls FAL, returns image URL
- [ ] **GEN-03**: Generation history records persisted — prompt, result URL, brand snapshot, timestamps
- [ ] **GEN-04**: Visual history board — grid of past generations with loading/failure states

### Prompt Intelligence

- [ ] **PRMT-01**: `POST /api/generate/edit` — re-prompt variation from existing generation
- [ ] **PRMT-02**: Brand Intelligence CRUD — generate AI insights from brand kit data, store and retrieve
- [ ] **PRMT-03**: Brand Intelligence UI editor — view/edit AI-generated brand insights inline
- [ ] **PRMT-04**: Reusable Gemini wrapper — single `services/gemini.js` used by all LLM calls
- [ ] **PRMT-05**: Prompt composition endpoint — assembles final prompt from strategy + selected assets + brand kit
- [ ] **PRMT-06**: Deterministic fallback — when Gemini fails, compose prompt from raw brand kit fields

### Reverse & Concepts

- [ ] **PRMT-07**: Reverse-engineering endpoint — analyze winning ad image via Gemini, extract strategy JSON
- [ ] **PRMT-08**: Reverse Engineer modal — displays extracted strategy with direct actions (generate variation, save as template)
- [ ] **PRMT-09**: Concept generation endpoint — generates N strategic concept directions from brand context

### Campaign Builder

- [ ] **CAMP-01**: Campaign planning endpoint — profile-first intake (objective, audience, budget), returns campaign plan
- [ ] **CAMP-02**: Batch generation — generate multiple ads from campaign plan with per-item progress tracking
- [ ] **CAMP-03**: Campaign builder UX — multi-step flow (Plan → Review → Generate → Results)

### Operations

- [ ] **OPS-01**: Production hardening — upload size/type validation, secure file path resolution, orphan file cleanup, env var docs

## v2 Requirements

### Analytics

- **ANLX-01**: Generation success/failure rate tracking
- **ANLX-02**: Most-used templates and brand kits report

### Export

- **EXPO-01**: Export campaign results as ZIP (images + metadata)
- **EXPO-02**: Export brand kit as JSON for sharing between clients

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / login | Single-user Replit deployment; auth adds complexity without value |
| Video ad generation | Scope too large; static images only for v1 |
| Real-time collaboration | Single-user model |
| Webhook callbacks | No queue system; synchronous only |
| Mobile app | Web-first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCAF-01 | Phase 1 | Complete |
| SCAF-02 | Phase 1 | Complete |
| SCAF-03 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Complete |
| CLNT-01 | Phase 3 | Pending |
| CLNT-02 | Phase 3 | Pending |
| CLNT-03 | Phase 3 | Pending |
| CLNT-04 | Phase 3 | Pending |
| TMPL-01 | Phase 4 | Pending |
| TMPL-02 | Phase 4 | Pending |
| ASST-01 | Phase 4 | Pending |
| ASST-02 | Phase 4 | Pending |
| GEN-01 | Phase 5 | Pending |
| GEN-02 | Phase 5 | Pending |
| GEN-03 | Phase 5 | Pending |
| GEN-04 | Phase 5 | Pending |
| PRMT-01 | Phase 6 | Pending |
| PRMT-02 | Phase 6 | Pending |
| PRMT-03 | Phase 6 | Pending |
| PRMT-04 | Phase 6 | Pending |
| PRMT-05 | Phase 6 | Pending |
| PRMT-06 | Phase 6 | Pending |
| PRMT-07 | Phase 7 | Pending |
| PRMT-08 | Phase 7 | Pending |
| PRMT-09 | Phase 7 | Pending |
| CAMP-01 | Phase 8 | Pending |
| CAMP-02 | Phase 8 | Pending |
| CAMP-03 | Phase 8 | Pending |
| OPS-01 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after initial definition*
