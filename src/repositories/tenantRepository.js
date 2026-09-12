const pool = require('../db/connection');

async function findByApiKey(apiKey) {
  const result = await pool.query('SELECT * FROM tenants WHERE api_key = $1', [apiKey]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updatePlan(tenantId, planId) {
  const result = await pool.query(
    'UPDATE tenants SET plan_id = $1 WHERE id = $2 RETURNING *',
    [planId, tenantId]
  );
  return result.rows[0] || null;
}

async function updateStripeCustomerId(tenantId, customerId) {
  const result = await pool.query(
    'UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2 RETURNING *',
    [customerId, tenantId]
  );
  return result.rows[0] || null;
}

async function updateStripeSubscription(tenantId, subscriptionId, status) {
  const result = await pool.query(
    'UPDATE tenants SET stripe_subscription_id = $1, subscription_status = $2 WHERE id = $3 RETURNING *',
    [subscriptionId, status, tenantId]
  );
  return result.rows[0] || null;
}

async function updateSubscriptionStatus(tenantId, status) {
  const result = await pool.query(
    'UPDATE tenants SET subscription_status = $1 WHERE id = $2 RETURNING *',
    [status, tenantId]
  );
  return result.rows[0] || null;
}

async function findByStripeCustomerId(customerId) {
  const result = await pool.query('SELECT * FROM tenants WHERE stripe_customer_id = $1', [customerId]);
  return result.rows[0] || null;
}

module.exports = { findByApiKey, findById, updatePlan,updateStripeCustomerId,updateStripeSubscription,updateSubscriptionStatus,findByStripeCustomerId };