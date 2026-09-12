const pool = require('../db/connection');

// This unique-constraint-backed insert is what makes webhook processing idempotent —
// same rule as usage_events. If Stripe resends the same event, this returns null,
// and the caller knows not to reprocess it.
async function markProcessed(stripeEventId, eventType) {
  const result = await pool.query(
    `INSERT INTO processed_webhook_events (stripe_event_id, event_type)
     VALUES ($1, $2)
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING *`,
    [stripeEventId, eventType]
  );
  return result.rows[0] || null;
}

module.exports = { markProcessed };