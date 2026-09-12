const express = require('express');
const router = express.Router();

const stripe = require('../services/stripeClient');
const billingService = require('../services/billingService');
const asyncHandler = require('../utils/asyncHandler');

router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }), // raw body required for signature check
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      // Signature invalid = possibly forged request. Reject, do not process.
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    const result = await billingService.handleWebhookEvent(event);
    res.status(200).json({ received: true, alreadyProcessed: result.alreadyProcessed });
  })
);

module.exports = router;