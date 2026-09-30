require('dotenv').config();
const billingService = require('../services/billingService');

async function run() {
  const fakeEvent = {
    id: 'evt_test_dedupe_123',//internship code
    type: 'customer.subscription.updated',
    data: { object: { customer: 'cus_test_fake', status: 'active' } }
  };

  console.log('First call:');
  console.log(await billingService.handleWebhookEvent(fakeEvent));

  console.log('Second call (same event id):');
  console.log(await billingService.handleWebhookEvent(fakeEvent));

  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });