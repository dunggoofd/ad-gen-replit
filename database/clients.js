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

async function listClients() {
  const result = await pool.query('SELECT * FROM clients ORDER BY id ASC');
  return result.rows;
}

async function createClient(name) {
  const result = await pool.query(
    'INSERT INTO clients (name) VALUES ($1) RETURNING *',
    [name]
  );
  return result.rows[0];
}

async function renameClient(id, name) {
  const result = await pool.query(
    'UPDATE clients SET name = $1 WHERE id = $2 RETURNING *',
    [name, id]
  );
  return result.rows[0] || null;
}

async function deleteClient(id) {
  const count = await pool.query('SELECT COUNT(*) FROM clients');
  if (parseInt(count.rows[0].count, 10) <= 1) {
    const err = new Error('Cannot delete the last workspace');
    err.status = 409;
    throw err;
  }
  await pool.query('DELETE FROM clients WHERE id = $1', [id]);
}

module.exports = { getClientById, getDefaultClient, listClients, createClient, renameClient, deleteClient };
