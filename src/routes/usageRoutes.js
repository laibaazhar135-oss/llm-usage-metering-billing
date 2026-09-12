const express = require('express');
const router = express.Router();

const apiKeyAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const meterService = require('../services/meterService');
const planRepository = require('../repositories/planRepository');
const usageRepository = require('../repositories/usageRepository');

// The one dummy billable endpoint required by the capstone.
router.post('/generate', apiKeyAuth, asyncHandler(async (req, res) => {
  const idempotencyKey = req.header('Idempotency-Key');
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  const { event_type, payload } = req.body;
  if (!event_type) {
    return res.status(400).json({ error: 'event_type is required in the request body' });
  }

  const result = await meterService.record(req.tenant, event_type, payload || {}, idempotencyKey);
  res.status(result.replayed ? 200 : 201).json(result);
}));

router.get('/usage', apiKeyAuth, asyncHandler(async (req, res) => {
  const plan = await planRepository.findById(req.tenant.plan_id);
  const apiCalls = await usageRepository.sumUsageThisMonth(req.tenant.id, 'api_call');
  const tokens = await usageRepository.sumUsageThisMonth(req.tenant.id, 'ai_tokens');

  res.json({
    plan: plan.name,
    api_calls: { used: apiCalls, limit: plan.monthly_api_call_limit },
    ai_tokens: { used: tokens, limit: plan.monthly_token_limit }
  });
}));

module.exports = router;