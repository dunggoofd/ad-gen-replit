# Phase 1: Core Scaffold - Research

**Researched:** 2026-03-02
**Domain:** Express 5, node-postgres, Replit deployment config, Tailwind CDN
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCAF-01 | Node/Express monolith runs with `npm start`, serves `views/index.html`, loads Tailwind via CDN | Express 5 static middleware, Tailwind CDN script tag, Replit `.replit` run config |
| SCAF-02 | Baseline middleware wired (JSON, cookies, static, CORS), `GET /api/health` returns 200 with uptime | Express 5 middleware stack, `process.uptime()`, route handler patterns |
| SCAF-03 | PostgreSQL connects on startup, `database/init.js` runs all `CREATE TABLE IF NOT EXISTS` idempotently | `pg` Pool with `DATABASE_URL`, startup connect test, `CREATE TABLE IF NOT EXISTS` SQL |
</phase_requirements>

## Summary

Phase 1 builds the skeleton on which all subsequent phases attach: Express 5 server, PostgreSQL pool, health endpoint, static HTML serving, and Replit deployment files. The stack is fully locked in PROJECT.md — Node.js 18+, Express 5, `pg` Pool, vanilla JS + Tailwind CDN, no build step, CommonJS.

Express 5 was released as stable in late 2024. Its key win for this project is automatic async error forwarding — rejected promises in route handlers propagate to the error middleware without explicit `try/catch`. The middleware setup is otherwise nearly identical to Express 4, with minor defaults changing (`urlencoded({ extended })` defaults to `false`).

The Tailwind CDN approach (`@tailwindcss/browser@4` or the v3 `https://cdn.tailwindcss.com` script) is intentionally development-grade. Since this is a Replit single-file UI with no build step, the CDN tradeoff is acceptable and matches the project's "serve-and-go" constraint.

**Primary recommendation:** Stand up `server.js` with 6 middleware lines, mount a `/api/health` route returning `{ status: "ok", uptime: process.uptime() }`, wire `express.static("public")` and `res.sendFile` for the HTML, connect a `pg.Pool` from `DATABASE_URL`, run `database/init.js` on startup, then add `.replit` and `replit.nix`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^5.1.0 | HTTP server, routing, middleware | Locked by PROJECT.md; stable since late 2024 |
| pg | ^8.13.x | PostgreSQL connection pool | Official Node.js Postgres driver; `Pool` handles reconnect |
| cookie-parser | ^1.4.x | Parse `Cookie` header into `req.cookies` | Required for `active_client_id` httpOnly cookie (multi-tenancy) |
| cors | ^2.8.x | Cross-Origin Resource Sharing headers | Required for API calls from browser clients |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | ^16.x | Load `.env` file locally | Local dev only; Replit uses Secrets; keep `require('dotenv').config()` in entry |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pg` Pool | `postgres` (Postgres.js) | postgres.js is faster but `pg` is the project's locked choice |
| Tailwind CDN | Build step (CLI/Vite) | CDN acceptable for single-file UI; no build step is a hard project constraint |

**Installation:**
```bash
npm install express pg cookie-parser cors
npm install --save-dev dotenv
```

## Architecture Patterns

### Recommended Project Structure
```
server.js              Entry point — middleware, routes, listen, error handler
database/
  init.js              Pool export + startup schema bootstrap
routes/
  health.js            GET /api/health
views/
  index.html           Full single-page UI
public/
  uploads/             Multer target dirs (created at startup)
.replit                Replit run + deployment config
replit.nix             Nix environment (Node.js version)
package.json           scripts: { "start": "node server.js" }
```

### Pattern 1: Express 5 Server Entry Point
**What:** Minimal `server.js` that wires middleware, mounts routes, adds error handler, and calls `listen`.
**When to use:** Always — single entry point for the monolith.
**Example:**
```javascript
// Source: https://expressjs.com/en/guide/migrating-5.html
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Express 5 default; be explicit
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve index.html for all non-API routes
app.get('*splat', (req, res) => {           // Express 5: wildcards must be named
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Error handler (Express 5: async errors are forwarded here automatically)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message });
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
```

### Pattern 2: pg Pool + Database Init
**What:** Export a shared `Pool` instance from `database/init.js`; call `initDb()` on startup to verify connection and run schema DDL.
**When to use:** All database modules import the pool from `database/init.js`.
**Example:**
```javascript
// Source: https://node-postgres.com/apis/pool
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Always attach error listener — unhandled pool errors crash Node
pool.on('error', (err) => {
  console.error('Unexpected pg pool error', err);
});

async function initDb() {
  // Verify connectivity at startup
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('Database connected');
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // ... all other CREATE TABLE IF NOT EXISTS statements
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
```

### Pattern 3: Replit Config Files
**What:** `.replit` (TOML) and `replit.nix` tell Replit how to run and what system packages to install.
**When to use:** Required for Replit Deploy.
**Example `.replit`:**
```toml
# Source: https://docs.replit.com/replit-workspace/configuring-repl
entrypoint = "server.js"
modules = ["nodejs-20"]

[nix]
channel = "stable-23_11"

[run]
args = ["npm", "start"]

[[ports]]
localPort = 3000
externalPort = 80

[deployment]
run = ["npm", "start"]
deploymentTarget = "cloudrun"
```
**Example `replit.nix`:**
```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
  ];
}
```

### Pattern 4: Tailwind CDN in index.html
**What:** Single `<script>` tag in `<head>` loads Tailwind without a build step.
**When to use:** This project's only approach — no build pipeline.
**Example:**
```html
<!-- Source: https://tailwindcss.com/docs/installation/play-cdn -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- v4 CDN (development-grade, acceptable for Replit single-user app) -->
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <!-- OR v3 CDN (more stable, widely tested) -->
    <!-- <script src="https://cdn.tailwindcss.com"></script> -->
    <title>Static Ads Generator</title>
  </head>
  <body class="bg-gray-50">
    <!-- ... -->
  </body>
</html>
```

### Anti-Patterns to Avoid
- **Named wildcard missing:** In Express 5, `app.get('/*', ...)` is invalid. Use `app.get('/*splat', ...)`.
- **`res.send(body, status)` order:** Express 5 requires `res.status(N).json(body)` — status must be set first.
- **Missing `pool.on('error')`:** Unhandled idle client errors crash Node with an uncaught exception.
- **`client.release()` outside finally:** If the query throws, the client leaks and the pool exhausts.
- **`app.del()` usage:** Removed in Express 5; use `app.delete()`.
- **`req.param(name)`:** Removed; use `req.params.name`, `req.body`, or `req.query` directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom pool manager | `pg.Pool` | Handles idle reconnect, SSL, `max`, `idleTimeoutMillis` |
| CORS headers | Manual `res.setHeader` | `cors` package | Handles preflight OPTIONS, credentials, origin lists |
| Cookie parsing | Manual `req.headers.cookie` split | `cookie-parser` | Handles encoding, signed cookies |
| Static file serving | Manual `fs.readFile` + mime types | `express.static` | ETag, cache headers, range requests |

**Key insight:** Express middleware ecosystem covers all HTTP concerns in Phase 1. There is nothing in this phase that requires custom low-level implementation.

## Common Pitfalls

### Pitfall 1: PostgreSQL SSL on Replit
**What goes wrong:** `pool.connect()` throws `SSL SYSCALL error` or `self-signed certificate` when connecting to Neon.tech or Replit's managed Postgres.
**Why it happens:** Hosted Postgres requires SSL; self-signed certs fail `rejectUnauthorized: true` (the default).
**How to avoid:** Set `ssl: { rejectUnauthorized: false }` in Pool config when `DATABASE_URL` is present. Neon.tech connections always need SSL.
**Warning signs:** Stack trace contains `ECONNRESET` or `SSL` on first startup.

### Pitfall 2: Port Binding on Replit
**What goes wrong:** App binds to `localhost:3000` but Replit can't route external traffic to it.
**Why it happens:** Replit requires binding to `0.0.0.0` or using the `PORT` env var it injects.
**How to avoid:** Always use `process.env.PORT || 3000`; Express `app.listen(PORT)` without a host argument defaults to `0.0.0.0` which is correct.
**Warning signs:** Replit preview shows "can't connect" even though server logs show it started.

### Pitfall 3: Express 5 Wildcard Route Syntax
**What goes wrong:** `app.get('/*', ...)` throws a startup error or silently fails in Express 5.
**Why it happens:** Express 5 upgraded `path-to-regexp` to v8.x which requires named wildcards.
**How to avoid:** Use `app.get('/*splat', ...)` for catch-all SPA route.
**Warning signs:** `TypeError` at route registration time referencing path-to-regexp.

### Pitfall 4: `initDb()` Not Awaited Before `listen()`
**What goes wrong:** Server starts accepting requests before database schema exists; first request to any DB-backed route fails.
**Why it happens:** Async `initDb` called without `await`.
**How to avoid:** Wrap in `async function start()` and `await initDb()` before `app.listen()`.
**Warning signs:** First requests return 500; log shows table-does-not-exist errors.

### Pitfall 5: Tailwind CDN v4 Browser Compatibility
**What goes wrong:** Tailwind styles don't apply in older browsers.
**Why it happens:** `@tailwindcss/browser@4` targets Safari 16.4+, Chrome 111+, Firefox 128+.
**How to avoid:** For a Replit single-user app this is acceptable. If needed, fall back to v3 CDN: `https://cdn.tailwindcss.com`.
**Warning signs:** Styles appear broken on legacy browsers.

## Code Examples

### Health Endpoint
```javascript
// Express 5 — no try/catch needed; async errors auto-forwarded
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
```

### Startup Log Pattern
```javascript
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
    console.log(`[db] Connected to PostgreSQL`);
  });
}
start().catch((err) => {
  console.error('[fatal] Startup failed:', err);
  process.exit(1);
});
```

### Express Static + HTML Fallback
```javascript
// Source: https://expressjs.com/en/starter/static-files.html
app.use(express.static(path.join(__dirname, 'public')));

// Express 5 named wildcard — serves index.html for browser navigation
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
```

### Pool Query Pattern (no transaction)
```javascript
// Source: https://node-postgres.com/apis/pool
const { pool } = require('../database/init');

const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
return result.rows[0];
```

### Pool Transaction Pattern (use explicit client)
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...', [...]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release(); // always release
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express 4 with manual async wrappers | Express 5 native async error forwarding | Late 2024 | Eliminates `asyncHandler` wrapper utility |
| `app.get('/*', ...)` wildcard | `app.get('/*splat', ...)` named wildcard | Express 5 | Must update any catch-all routes |
| `res.send(body, status)` | `res.status(N).json(body)` | Express 5 | Method chaining required |
| `express.urlencoded({ extended: true })` default | Defaults to `false` in Express 5 | Express 5 | Be explicit; project only uses JSON API so likely no impact |

**Deprecated/outdated:**
- `app.del()`: Removed in Express 5; use `app.delete()`.
- `req.param(name)`: Removed; use `req.params`, `req.body`, `req.query` explicitly.
- `res.sendfile()`: Removed; use `res.sendFile()` (camelCase).

## Open Questions

1. **Replit Postgres vs Neon.tech**
   - What we know: STATE.md flags this as a blocker; PROJECT.md says "Replit built-in or Neon.tech"
   - What's unclear: Whether Replit's built-in Postgres is available on the target plan tier
   - Recommendation: Write `database/init.js` to accept any `DATABASE_URL`; add SSL config that handles both. User confirms before Phase 1 execution.

2. **Tailwind version: v3 vs v4 CDN**
   - What we know: v4 CDN (`@tailwindcss/browser@4`) works but targets modern browsers only; v3 CDN is more conservative
   - What's unclear: Which the user prefers for this project
   - Recommendation: Default to v3 CDN (`https://cdn.tailwindcss.com`) for broader compatibility; easy to upgrade.

## Sources

### Primary (HIGH confidence)
- [expressjs.com/en/guide/migrating-5.html](https://expressjs.com/en/guide/migrating-5.html) — Express 5 breaking changes, route syntax, async error handling
- [node-postgres.com/apis/pool](https://node-postgres.com/apis/pool) — Pool constructor, error events, query patterns
- [tailwindcss.com/docs/installation/play-cdn](https://tailwindcss.com/docs/installation/play-cdn) — CDN script tag, v4 limitations
- [docs.replit.com/replit-workspace/configuring-repl](https://docs.replit.com/replit-workspace/configuring-repl) — `.replit` TOML format, port config, deployment section

### Secondary (MEDIUM confidence)
- [infoq.com/news/2025/01/express-5-released](https://www.infoq.com/news/2025/01/express-5-released/) — Express 5 stable release announcement, Node 18+ requirement confirmed
- [npmjs.com/package/cors](https://www.npmjs.com/package/cors) — CORS middleware options

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs; versions from npm
- Architecture: HIGH — Express 5 and pg patterns verified against official sources
- Pitfalls: HIGH (SSL, port) / MEDIUM (Tailwind compat) — SSL/port from official Replit + pg docs; Tailwind compat from official v4 docs

**Research date:** 2026-03-02
**Valid until:** 2026-06-02 (90 days — Express 5 and pg are stable; Replit config format changes slowly)
