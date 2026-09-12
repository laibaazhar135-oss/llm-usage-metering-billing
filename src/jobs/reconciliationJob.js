const stripe = require('../services/stripeClient');
const pool = require('../db/connection');

const MAX_RETRIES = 3;

// This runs OFF the request path — no HTTP request triggers this, it's purely time-based.
// It catches cases where a webhook was missed (network blip, downtime) by directly
// asking Stripe for the truth and correcting our database if they've drifted apart.
async function reconcileOnce() {
  const result = await pool.query(
    `SELECT id, stripe_subscription_id, subscription_status FROM tenants WHERE stripe_subscription_id IS NOT NULL`
  );

  for (const tenant of result.rows) {
    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
      try {
        const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);

        if (subscription.status !== tenant.subscription_status) {
          console.log(
            `RECONCILE: tenant ${tenant.id} drifted — DB said "${tenant.subscription_status}", Stripe says "${subscription.status}". Correcting.`
          );
          await pool.query(
            'UPDATE tenants SET subscription_status = $1 WHERE id = $2',
            [subscription.status, tenant.id]
          );
        }
        success = true;
      } catch (err) {
        attempt++;
        console.error(`RECONCILE attempt ${attempt} failed for tenant ${tenant.id}: ${err.message}`);

        if (attempt >= MAX_RETRIES) {
          // Failure alert: loud, clearly marked log line a real system would wire to Slack/PagerDuty.
          console.error(`ALERT: reconciliation permanently failed for tenant ${tenant.id} after ${MAX_RETRIES} attempts.`);
        }
      }
    }
  }
}

function startReconciliationJob(intervalMs = 60000) {
  console.log(`Reconciliation background job started — running every ${intervalMs / 1000}s`);
  setInterval(() => {
    reconcileOnce().catch((err) => {
      console.error('ALERT: reconciliation job crashed unexpectedly:', err.message);
    });
  }, intervalMs);
}

module.exports = { startReconciliationJob, reconcileOnce };