const express = require('express');
const router = express.Router();

const apiKeyAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const billingService = require('../services/billingService');

router.post('/billing/checkout', apiKeyAuth, asyncHandler(async (req, res) => {
  const session = await billingService.createCheckoutSession(req.tenant);
  res.status(200).json({ checkout_url: session.url });
}));

module.exports = router;