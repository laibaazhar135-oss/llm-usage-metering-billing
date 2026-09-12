require('dotenv').config();
const pool = require('../db/connection');

async function seed() {
  await pool.query(`
    INSERT INTO plans (name, monthly_api_call_limit, monthly_token_limit, price_cents)
    VALUES ('free', 100, 5000, 0)
    ON CONFLICT (name) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO plans (name, monthly_api_call_limit, monthly_token_limit, price_cents)
    VALUES ('pro', 10000, 500000, 2000)
    ON CONFLICT (name) DO NOTHING;
  `);

  const freePlan = await pool.query(`SELECT id FROM plans WHERE name = 'free'`);

  await pool.query(`
    INSERT INTO tenants (name, api_key, plan_id)
    VALUES ('demo-tenant', 'demo-key-123', $1)
    ON CONFLICT (api_key) DO NOTHING;
  `, [freePlan.rows[0].id]);

  console.log('Seed complete. Use API key: demo-key-123');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});