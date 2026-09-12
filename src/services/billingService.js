const stripe = require('./stripeClient');
const tenantRepository = require('../repositories/tenantRepository');
const planRepository = require('../repositories/planRepository');
const webhookRepository = require('../repositories/webhookRepository');
console.log('DEBUG stripe type:', typeof stripe, '| customers:', stripe && typeof stripe.customers);

async function createCheckoutSession(tenant) {
  let customerId = tenant.stripe_customer_id;

  // Create a Stripe Customer once per tenant, reuse afterwards — never create duplicates.
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { tenant_id: String(tenant.id) }
    });
    customerId = customer.id;
    await tenantRepository.updateStripeCustomerId(tenant.id, customerId);
  }

  const proPlan = await planRepository.findByName('pro');
  if (!proPlan.stripe_price_id) {
    const err = new Error('Pro plan has no stripe_price_id configured yet');
    err.statusCode = 500;
    throw err;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: proPlan.stripe_price_id, quantity: 1 }],
    success_url: 'http://localhost:3000/billing/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'http://localhost:3000/billing/cancel',
    metadata: { tenant_id: String(tenant.id) }
  });

  return session;
}

// Stripe is the source of truth. We only ever mirror what a VERIFIED webhook tells us —
// never trust a client claiming "I paid, upgrade me."
async function handleWebhookEvent(event) {
  const inserted = await webhookRepository.markProcessed(event.id, event.type);
  if (!inserted) {
    return { alreadyProcessed: true }; // duplicate delivery — Stripe resends events, this is normal
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const tenantId = parseInt(session.metadata.tenant_id, 10);
      const proPlan = await planRepository.findByName('pro');
      await tenantRepository.updateStripeSubscription(tenantId, session.subscription, 'active');
      await tenantRepository.updatePlan(tenantId, proPlan.id);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const tenant = await tenantRepository.findByStripeCustomerId(subscription.customer);
      if (tenant) {
        await tenantRepository.updateSubscriptionStatus(tenant.id, subscription.status);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const tenant = await tenantRepository.findByStripeCustomerId(subscription.customer);
      if (tenant) {
        const freePlan = await planRepository.findByName('free');
        await tenantRepository.updatePlan(tenant.id, freePlan.id);
        await tenantRepository.updateSubscriptionStatus(tenant.id, 'canceled');
      }
      break;
    }
    default:
      break; // ignore event types we don't care about
  }

  return { alreadyProcessed: false };
}

module.exports = { createCheckoutSession, handleWebhookEvent };