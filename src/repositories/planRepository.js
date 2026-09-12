const pool = require('../db/connection');

async function findById(id) {
  const result = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findByName(name) {
  const result = await pool.query('SELECT * FROM plans WHERE name = $1', [name]);
  return result.rows[0] || null;
}

module.exports = { findById, findByName };