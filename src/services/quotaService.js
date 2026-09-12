const planRepository = require('../repositories/planRepository');
const usageRepository = require('../repositories/usageRepository');

async function checkQuota(tenant, eventType, incomingUnits) {
  const plan = await planRepository.findById(tenant.plan_id);
  const limit = eventType === 'api_call'
    ? plan.monthly_api_call_limit
    : plan.monthly_token_limit;

  const currentUsage = await usageRepository.sumUsageThisMonth(tenant.id, eventType);
  const projected = currentUsage + incomingUnits;

  return {
    allowed: projected <= limit,
    currentUsage,
    limit,
    projected
  };
}

module.exports = { checkQuota };