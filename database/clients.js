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
