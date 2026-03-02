# Phase 2: Data Model & Multi-tenancy - Research

**Researched:** 2026-03-02
**Domain:** PostgreSQL DDL (CREATE TABLE IF NOT EXISTS), node-postgres, Express middleware, multi-tenancy via header/cookie/fallback
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | All tables exist with correct columns, indexes, and constraints (clients, brand_kits, templates, assets, generations, brand_intelligence, campaigns) | Full DDL schema in Code Examples; idempotent pattern via IF NOT EXISTS; index strategy documented |
| DATA-02 | `clientScope` middleware resolves active client via header → cookie → fallback; all per-client routes enforce it | Middleware pattern, cookie read from `req.cookies`, 503 response on no-client documented |
</phase_requirements>

## Summary

Phase 2 extends the `database/init.js` already in place (which has the `clients` table skeleton) with the full schema — six additional tables plus indexes and foreign-key constraints, all written as idempotent DDL. STATE.md explicitly records: "Phase 2 (plan 02-01) extends initDb() with additional DDL statements; clients table is first." The `clients` table DDL must stay first because every other table has a `client_id` foreign key referencing it.

Plan 02-02 adds `database/clients.js` (two query functions: `getClientById`, `getDefaultClient`) and `middleware/clientScope.js` (the resolution chain: `X-Client-Id` header → `active_client_id` cookie → lowest-id DB fallback → 503 error). The cookie-parser middleware is already wired in `server.js`, so `req.cookies` is available without additional setup. Express 5 async error forwarding means `clientScope` can be an `async` function — uncaught rejections are automatically forwarded to the error handler.

**Primary recommendation:** Append all remaining DDL to the existing `initDb()` using a single acquired client for the whole batch (cheaper than reconnecting per table), create `database/clients.js` with two named exports, and implement `clientScope` as an `async` middleware that sets `req.clientId` and `req.client` or calls `next(err)`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pg | ^8.13.x | Pool.query() and pool.connect() for all DB operations | Already installed; shared pool exported from database/init.js |
| cookie-parser | ^1.4.x | Parses `active_client_id` cookie into `req.cookies` | Already wired in server.js; no additional install needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | All dependencies for this phase are already installed | Phase 1 covered all runtime deps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sequential DDL in one client | Separate `pool.query()` per table | One client = one round-trip setup; both work but single client is correct since it's already the pattern in initDb() |
| 503 for missing client | 401/400 | 503 "Service Unavailable" is semantically correct — the service cannot operate without a client context; 400/401 imply client error, not system state |

## Architecture Patterns

### Recommended Project Structure
```
database/
  init.js          (exists) — extend initDb() with full schema
  clients.js       (new) — getClientById(id), getDefaultClient()
middleware/
  clientScope.js   (new) — async Express middleware
```

### Pattern 1: Full DDL in a single initDb() client
**What:** Acquire one client at startup, run all CREATE TABLE IF NOT EXISTS statements in sequence, release in finally.
**When to use:** All DDL must execute before the server accepts requests; one client for all DDL is cheaper and groups the work.
**Example:**
```javascript
// Source: https://node-postgres.com/apis/client
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('[db] Connected to PostgreSQL');

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brand_kits (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        primary_color TEXT,
        secondary_color TEXT,
        accent_color TEXT,
        fonts JSONB,
        tone_of_voice TEXT,
        tagline TEXT,
        logo_light TEXT,
        logo_dark TEXT,
        logo_icon TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        thumbnail TEXT,
        is_favorite BOOLEAN DEFAULT FALSE,
        tags TEXT[],
        source_type TEXT CHECK (source_type IN ('starter', 'user', 'winner')) DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        mimetype TEXT,
        category TEXT CHECK (category IN ('Product', 'Packaging', 'Lifestyle', 'Logo', 'Other')),
        tags TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS generations (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        result_url TEXT,
        brand_snapshot JSONB,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brand_intelligence (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        content JSONB,
        generated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        objective TEXT,
        audience TEXT,
        budget TEXT,
        plan JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes (IF NOT EXISTS requires PostgreSQL 9.5+; Replit/Neon are 14+)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_brand_kits_client ON brand_kits(client_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_templates_client ON templates(client_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_client ON assets(client_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_generations_client ON generations(client_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_brand_intelligence_client ON brand_intelligence(client_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id)`);

    console.log('[db] Schema initialized');
  } finally {
    client.release();
  }
}
```

### Pattern 2: clientScope middleware
**What:** Async Express middleware that resolves `req.clientId` and `req.client` from three sources in priority order, or returns 503.
**When to use:** Mount on all per-client API routers (not on /api/health, not on the SPA catch-all).
**Example:**
```javascript
// middleware/clientScope.js
// Source: PROJECT.md multi-tenancy model + node-postgres.com/apis/pool
const { getClientById, getDefaultClient } = require('../database/clients');

async function clientScope(req, res, next) {
  try {
    let client = null;

    // Priority 1: X-Client-Id header (API/scripts)
    const headerId = req.headers['x-client-id'];
    if (headerId) {
      client = await getClientById(parseInt(headerId, 10));
    }

    // Priority 2: active_client_id cookie (browser UI)
    if (!client && req.cookies.active_client_id) {
      client = await getClientById(parseInt(req.cookies.active_client_id, 10));
    }

    // Priority 3: lowest-id fallback (first-time user)
    if (!client) {
      client = await getDefaultClient();
    }

    if (!client) {
      return res.status(503).json({ error: 'No client workspace available. Create a client first.' });
    }

    req.clientId = client.id;
    req.client = client;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { clientScope };
```

### Pattern 3: database/clients.js query module
**What:** Thin query wrapper functions that use `pool.query()` directly (no transaction needed for simple SELECTs).
**When to use:** All client-related queries; imported by clientScope and future route handlers.
**Example:**
```javascript
// database/clients.js
// Source: https://node-postgres.com/apis/pool
const { pool } = require('./init');

async function getClientById(id) {
  if (!id || isNaN(id)) return null;
  const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getDefaultClient() {
  const result = await pool.query('SELECT * FROM clients ORDER BY id ASC LIMIT 1');
  return result.rows[0] || null;
}

module.exports = { getClientById, getDefaultClient };
```

### Pattern 4: Mounting clientScope on routers in server.js
**What:** Apply `clientScope` to all per-client route prefixes, not globally, so `/api/health` still works without a client.
**When to use:** When mounting per-client routes in server.js.
**Example:**
```javascript
// server.js (future phases will add routes; this shows the mounting pattern)
const { clientScope } = require('./middleware/clientScope');

// Per-client routes — all enforced by clientScope
app.use('/api/clients', clientScope, require('./routes/clients'));
app.use('/api/brand-kit', clientScope, require('./routes/brandKit'));
// ... etc.

// Health stays unguarded:
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
```

### Anti-Patterns to Avoid
- **Global clientScope mount:** Mounting `app.use(clientScope)` before the health route means `GET /api/health` requires a client. Mount on specific routers only.
- **Storing clientId as string:** `req.headers['x-client-id']` is a string. Always `parseInt(headerId, 10)` before passing to `pool.query`.
- **No NaN guard in getClientById:** `parseInt('abc', 10)` returns `NaN`. SQL `WHERE id = NaN` throws. Guard with `if (isNaN(id)) return null`.
- **cookie vs httpOnly:** `clientScope` reads `req.cookies.active_client_id` (set by the server as httpOnly). Don't try to read it with `req.headers.cookie` manually — cookie-parser handles this.
- **Tables before clients:** Foreign keys require `clients` to exist before the referencing tables. The order in initDb() matters; `clients` is always first.
- **Missing IF NOT EXISTS on indexes:** `CREATE INDEX` without `IF NOT EXISTS` fails on re-run. Always use `CREATE INDEX IF NOT EXISTS`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-row parallel DDL | Custom migration runner | Sequential `client.query()` calls inside initDb() | This app has no runtime schema changes; startup DDL is sufficient and simple |
| Client ID parsing | Custom header parser | `parseInt(str, 10)` with NaN guard | One-liner; no library needed |
| Cookie reading | Manual header split | `req.cookies` from cookie-parser | Already wired in Phase 1 |
| UUID primary keys | uuid package | PostgreSQL SERIAL | SERIAL is simpler; sequential IDs are fine for single-user Replit app |

**Key insight:** All complexity in this phase is SQL design and Express middleware composition — both are straightforward with existing tools. No new npm packages are needed.

## Common Pitfalls

### Pitfall 1: DDL table order — foreign keys
**What goes wrong:** `CREATE TABLE IF NOT EXISTS brand_kits` runs before `CREATE TABLE IF NOT EXISTS clients` — PostgreSQL throws `relation "clients" does not exist`.
**Why it happens:** Foreign keys are enforced at DDL time; referenced table must exist before referencing table.
**How to avoid:** Always write `clients` DDL first in initDb(). All other tables follow.
**Warning signs:** Startup error `ERROR: relation "clients" does not exist` on first run with empty DB.

### Pitfall 2: `CREATE INDEX` without IF NOT EXISTS
**What goes wrong:** Second `npm start` with existing tables throws `ERROR: index "idx_brand_kits_client" already exists`.
**Why it happens:** `CREATE INDEX` (without IF NOT EXISTS) is not idempotent.
**How to avoid:** Always `CREATE INDEX IF NOT EXISTS idx_name ON table(col)`. Available in PostgreSQL 9.5+; Replit/Neon are both 14+.
**Warning signs:** Clean second startup fails even though tables exist.

### Pitfall 3: `parseInt` on header value without NaN check
**What goes wrong:** A request with `X-Client-Id: abc` causes `pool.query` to receive `NaN` and PostgreSQL throws `invalid input syntax for type integer`.
**Why it happens:** `parseInt('abc', 10)` returns `NaN`; the value is then interpolated into the parameterized query.
**How to avoid:** In `getClientById`, guard: `if (!id || isNaN(id)) return null`.
**Warning signs:** 500 error on requests with non-numeric client ID header; `invalid input syntax` in server logs.

### Pitfall 4: clientScope mounted globally before health route
**What goes wrong:** `/api/health` returns 503 "No client workspace available" before any client is created.
**Why it happens:** Global `app.use(clientScope)` runs before the health route handler.
**How to avoid:** Mount `clientScope` inline on per-client routes only: `app.use('/api/clients', clientScope, router)`.
**Warning signs:** Health check fails on fresh deployment; 503 instead of 200 from `/api/health`.

### Pitfall 5: Cookie name mismatch
**What goes wrong:** `clientScope` reads `req.cookies.active_client_id` but the UI sets a cookie named differently, so the cookie branch never resolves a client.
**Why it happens:** Cookie name not agreed on between middleware and the setter (future Phase 3 UI code).
**How to avoid:** Establish `active_client_id` as the canonical cookie name in `clientScope.js`; future phases must use this exact name when setting the cookie.
**Warning signs:** Cookie branch always falls through to DB fallback even when `active_client_id` is visibly set in browser DevTools.

## Code Examples

### Full schema order in initDb()
```javascript
// Correct table creation order (clients first — all others FK to it)
// 1. clients
// 2. brand_kits  (FK: client_id -> clients.id)
// 3. templates   (FK: client_id -> clients.id)
// 4. assets      (FK: client_id -> clients.id)
// 5. generations (FK: client_id -> clients.id)
// 6. brand_intelligence (FK: client_id -> clients.id)
// 7. campaigns   (FK: client_id -> clients.id)
// Then indexes for each FK column
```

### 503 response shape
```javascript
// When no client resolves — clear message for API consumers
res.status(503).json({ error: 'No client workspace available. Create a client first.' });
```

### Idempotent DDL pattern (PostgreSQL)
```sql
-- Tables
CREATE TABLE IF NOT EXISTS table_name (...);

-- Indexes (PostgreSQL 9.5+)
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);

-- No equivalent for constraints — use table-level CONSTRAINT inside CREATE TABLE
-- Foreign keys and CHECK constraints are defined inline in CREATE TABLE; they're idempotent because the whole table statement is IF NOT EXISTS
```

### getDefaultClient (lowest-id fallback)
```javascript
// ORDER BY id ASC LIMIT 1 — deterministic, lowest id wins
const result = await pool.query('SELECT * FROM clients ORDER BY id ASC LIMIT 1');
return result.rows[0] || null;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Migration files (knex/flyway) | Startup DDL with IF NOT EXISTS | — | Acceptable for single-user Replit app; no version tracking needed |
| Middleware wrapping async with `asyncHandler` | Native async middleware in Express 5 | Express 5 (2024) | `clientScope` can be `async function` — unhandled rejections forward to error handler automatically |

**Deprecated/outdated:**
- `CREATE INDEX` without `IF NOT EXISTS`: Works on first run but breaks idempotency. Always use IF NOT EXISTS.

## Open Questions

1. **brand_kits cardinality: one-per-client or many?**
   - What we know: CLNT-02 says "Brand Kit CRUD — upsert colors, fonts, tone of voice, tagline" — "upsert" implies one record per client.
   - What's unclear: Phase 3 will define exact upsert behavior.
   - Recommendation: Model as one row per client in `brand_kits`. Phase 2 schema creates the table; upsert logic is Phase 3's concern. Design the table without a unique constraint on `client_id` — let Phase 3 decide if it needs one.

2. **brand_intelligence: one-per-client or versioned?**
   - What we know: PRMT-02 says "store and retrieve" and PRMT-03 says "view/edit AI-generated brand insights inline" — implies a single editable record.
   - What's unclear: Whether multiple intelligence records are wanted per client.
   - Recommendation: One row per client (same pattern as brand_kits). Phase 6 will handle upsert.

3. **campaigns table: relationship to generations?**
   - What we know: CAMP-02 involves batch generation tied to a campaign plan.
   - What's unclear: Whether `generations` will get a `campaign_id` FK column in Phase 8.
   - Recommendation: Do not add `campaign_id` to `generations` now — Phase 8 can ALTER TABLE if needed. Keep schemas minimal for Phase 2.

## Sources

### Primary (HIGH confidence)
- `/Users/dungluong/static-ads-replit/database/init.js` — existing clients table DDL + pool pattern (confirmed from codebase)
- `/Users/dungluong/static-ads-replit/server.js` — confirmed cookie-parser already wired, Express 5 pattern in use
- `/Users/dungluong/static-ads-replit/.planning/STATE.md` — locked decisions: "Phase 2 (plan 02-01) extends initDb() with additional DDL statements; clients table is first"
- `/Users/dungluong/static-ads-replit/.planning/PROJECT.md` — multi-tenancy resolution order: header → cookie → lowest-id fallback
- https://node-postgres.com/apis/pool — pool.query parameterized query syntax
- https://www.postgresql.org/docs/current/sql-createindex.html — CREATE INDEX IF NOT EXISTS syntax

### Secondary (MEDIUM confidence)
- Phase 1 RESEARCH.md patterns — confirmed Express 5 async middleware forwarding, pool error listener requirements

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are Phase 1 carry-overs; no new dependencies
- Architecture: HIGH — DDL patterns verified from existing codebase; clientScope pattern is straightforward Express middleware
- Pitfalls: HIGH — all pitfalls verified from official PostgreSQL docs and existing codebase analysis

**Research date:** 2026-03-02
**Valid until:** 2026-06-02 (90 days — PostgreSQL DDL and Express 5 middleware are stable)
