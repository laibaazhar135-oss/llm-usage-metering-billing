const pool = require('../db/connection');

async function findByIdempotencyKey(tenantId, idempotencyKey) {
  const result = await pool.query(
    'SELECT * FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2',
    [tenantId, idempotencyKey]
  );
  return result.rows[0] || null;
}

// ON CONFLICT DO NOTHING is the real idempotency guard.
// If this returns no row, it means a duplicate key already exists —
// the caller must then go fetch that existing row instead of treating this as an error.
async function insertEvent({ tenantId, idempotencyKey, eventType, payload, unitsUsed, costCents }) {
  const result = await pool.query(
    `INSERT INTO usage_events (tenant_id, idempotency_key, event_type, payload, units_used, cost_cents)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
     RETURNING *`,
    [tenantId, idempotencyKey, eventType, payload, unitsUsed, costCents]
  );
  return result.rows[0] || null;
}

async function sumUsageThisMonth(tenantId, eventType) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(units_used), 0) AS total
     FROM usage_events
     WHERE tenant_id = $1 AND event_type = $2
       AND created_at >= date_trunc('month', now())`,
    [tenantId, eventType]
  );
  return parseInt(result.rows[0].total, 10);
}

module.exports = { findByIdempotencyKey, insertEvent, sumUsageThisMonth };