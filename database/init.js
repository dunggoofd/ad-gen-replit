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
    console.log('[db] Schema initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
