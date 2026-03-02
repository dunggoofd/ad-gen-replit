---
phase: 01-core-scaffold
plan: 01
subsystem: infra
tags: [express5, node, tailwind, replit, commonjs]

requires: []
provides:
  - Express 5 server entry point with 5-layer middleware stack
  - npm start script serving views/index.html via /*splat catch-all
  - Tailwind CDN HTML shell with /api/health smoke test
  - Replit deployment config (.replit + replit.nix) for Node 20 + port 3000->80
affects: [01-02, all-phases]

tech-stack:
  added: [express@5.2.1, pg@8.19.0, cookie-parser@1.4.7, cors@2.8.6, dotenv@16.6.1]
  patterns: [CommonJS require(), Express 5 named wildcard /*splat, async start() with initDb() before listen]

key-files:
  created: [server.js, package.json, views/index.html, public/.gitkeep, .replit, replit.nix]
  modified: []

key-decisions:
  - "Tailwind v3 CDN (cdn.tailwindcss.com) chosen over v4 — more stable per research"
  - "express.urlencoded({ extended: false }) explicit — Express 5 changed the default"
  - "CommonJS throughout — no type:module — required for Replit serve-and-go deployment"
  - "dotenv loaded only in non-production — Replit Secrets provide env vars in production"
  - "/*splat wildcard route for Express 5 path-to-regexp v8 compatibility (not /*)"

patterns-established:
  - "Middleware order: cors > json > urlencoded > cookieParser > static"
  - "4-arg error handler as last app.use"
  - "async start() pattern: initDb() then app.listen()"

requirements-completed: [SCAF-01, SCAF-02]

duration: 2min
completed: 2026-03-02
---

# Phase 1 Plan 01: Express 5 scaffold with Tailwind HTML shell, 5-layer middleware, and Replit deployment config

**Express 5 entry point (CommonJS) with cors/json/urlencoded/cookieParser/static middleware, /*splat SPA fallback, and .replit + replit.nix for Node 20 cloudrun deployment**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T09:51:35Z
- **Completed:** 2026-03-02T09:53:17Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- package.json bootstrapped with `"start": "node server.js"`, express@5, pg@8, cookie-parser, cors, dotenv
- server.js with 5 middleware layers, /api/health endpoint, /*splat catch-all serving views/index.html, 4-arg error handler, async start()
- views/index.html Tailwind v3 CDN shell with health fetch smoke test
- .replit and replit.nix configured for Node 20, port 3000->80, cloudrun deployment target

## Task Commits

1. **Task 1: Bootstrap package.json and install dependencies** - `b3c6dda` (chore)
2. **Task 2: Create server.js with full middleware stack** - `eb3524e` (feat)
3. **Task 3: Create views/index.html shell and Replit config files** - `fb35a29` (feat)

## Files Created/Modified
- `server.js` - Express 5 entry point, middleware stack, /api/health, /*splat SPA fallback, async start()
- `package.json` - npm start script, express/pg/cookie-parser/cors dependencies, engines.node>=18
- `views/index.html` - Tailwind CDN v3 SPA shell with /api/health fetch smoke test
- `public/.gitkeep` - Placeholder for Multer upload dirs (Phase 3)
- `.replit` - Replit run config: nodejs-20, port 3000->80, deploymentTarget=cloudrun
- `replit.nix` - Nix env: nodejs_20

## Decisions Made
- Tailwind v3 CDN (cdn.tailwindcss.com) — more stable than v4 per research notes
- `express.urlencoded({ extended: false })` made explicit — Express 5 changed the default behavior
- CommonJS throughout (`require()`), no `"type": "module"` — Replit serve-and-go deployment requires no build step
- dotenv loaded only in non-production environment; Replit Secrets handle production env vars
- `/*splat` wildcard syntax required by Express 5's path-to-regexp v8 (not `/*`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- server.js requires `./database/init` which must export `{ initDb }` — plan 01-02 must create this
- All middleware layers are in place; plan 01-02 adds the database layer and health route will be moved to routes/health.js
- The /*splat catch-all is in server.js; route mounting points are stubbed and ready for subsequent phases

---
*Phase: 01-core-scaffold*
*Completed: 2026-03-02*
