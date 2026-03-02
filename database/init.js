const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

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
    await client.query('CREATE INDEX IF NOT EXISTS idx_brand_kits_client ON brand_kits(client_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_templates_client ON templates(client_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_client ON assets(client_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_generations_client ON generations(client_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_brand_intelligence_client ON brand_intelligence(client_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id)');
    console.log('[db] Schema initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
