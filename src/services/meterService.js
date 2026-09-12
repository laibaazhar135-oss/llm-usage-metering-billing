const pricingService = require('./pricingService');
const quotaService = require('./quotaService');
const usageRepository = require('../repositories/usageRepository');

async function record(tenant, eventType, payload, idempotencyKey) {
  // Step 1 — fast path: has this EXACT request been processed before?
  // If yes, return the original stored result. Do NOT recompute, re-check quota, or re-charge.
  const existing = await usageRepository.findByIdempotencyKey(tenant.id, idempotencyKey);
  if (existing) {
    return { ...existing, replayed: true };
  }

  // Step 2 — compute cost and units for a genuinely new request
  const { costCents, unitsUsed } = pricingService.calculate(eventType, payload);

  // Step 3 — quota check (read-then-write; see BUILDLOG for the race-condition disclosure)
  const quota = await quotaService.checkQuota(tenant, eventType, unitsUsed);
  if (!quota.allowed) {
    const err = new Error(`Quota exceeded for ${eventType}`);
    err.statusCode = 429;
    err.details = quota;
    throw err;
  }

  // Step 4 — insert. The DB unique constraint is the real safety net:
  // if a concurrent duplicate request beat us here, insertEvent returns null, not an error.
  const inserted = await usageRepository.insertEvent({
    tenantId: tenant.id,
    idempotencyKey,
    eventType,
    payload,
    unitsUsed,
    costCents
  });

  if (!inserted) {
    const racedResult = await usageRepository.findByIdempotencyKey(tenant.id, idempotencyKey);
    return { ...racedResult, replayed: true };
  }

  return { ...inserted, replayed: false };
}

module.exports = { record };