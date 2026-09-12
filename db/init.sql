CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  monthly_api_call_limit INTEGER NOT NULL,
  monthly_token_limit INTEGER NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  stripe_price_id TEXT
);

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- The UNIQUE constraint below is what actually enforces idempotency.
-- Application code checking "does this key exist?" before inserting is NOT enough on its own —
-- two simultaneous requests could both pass that check. The database constraint is the real guard.
CREATE TABLE IF NOT EXISTS usage_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  units_used INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);