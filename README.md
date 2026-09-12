# LLM Usage Metering & Billing Service

A backend service that meters API/AI-token usage per tenant, enforces plan quotas, calculates costs, and syncs subscription plans via Stripe (test mode) webhooks.

## Architecture

Client → POST /generate (X-API-Key, Idempotency-Key)
→ meterService.record()
→ check idempotency_key (DB unique constraint) — duplicate? return original result
→ check quota (current usage + this request vs plan limit)
→ over limit? 429, nothing charged
→ insert usage_events row, return cost + units

Client → GET /usage → current usage vs plan limits

Client → POST /billing/checkout → Stripe Checkout Session (subscription mode)
Stripe → signed webhook → POST /webhooks/stripe
→ verify signature (invalid? 400, nothing processed)
→ dedupe via processed_webhook_events unique constraint (replay? ignored)
→ update tenant's plan/subscription_status in DB

Background job (every 60s, off the request path):
→ reconciles each Pro tenant's subscription_status against Stripe directly
→ retries up to 3x on failure, logs an ALERT on permanent failure


## Stack

- Node.js + Express
- PostgreSQL (via Docker)
- Stripe (test mode) for Checkout + webhooks
- Simulated AI token usage — no real LLM API calls are made; token counts are supplied by the caller and priced according to a fixed rate table

## How to Run

1. Start Docker Desktop, then:

docker compose up -d db

2. Copy `.env.example` to `.env` and fill in real values (Stripe secret key, webhook secret from `stripe listen`).
3. Install dependencies:

npm install

4. Seed the database (creates Free/Pro plans + one demo tenant):

npm run seed

5. Start the server:

npm start

6. In a separate terminal, forward Stripe webhooks locally:

stripe listen --forward-to localhost:3000/webhooks/stripe


Demo tenant API key: `demo-key-123`

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/generate` | X-API-Key + Idempotency-Key | Records a billable usage event (api_call or ai_tokens) |
| GET | `/usage` | X-API-Key | Current month's usage vs plan limits |
| POST | `/billing/checkout` | X-API-Key | Creates a Stripe Checkout session to upgrade to Pro |
| POST | `/webhooks/stripe` | Stripe signature | Receives verified Stripe events, syncs tenant plan |

## Plans (my own assumption, documented here as required)

| Plan | api_calls/month | ai_tokens/month | Price |
|---|---|---|---|
| Free | 100 | 5,000 | $0 |
| Pro | 10,000 | 500,000 | $20/month |

## Pricing (per 1,000 tokens, in cents — my own assumption)

| Token type | Price |
|---|---|
| input | 0.5¢ |
| cached_input | 0.25¢ |
| output | 1.5¢ |
| reasoning | 1.5¢ (billed same as output — never free) |

API calls: flat 1 cent each.

## Known Limitations (documented honestly, not hidden)

- **Quota check is read-then-write, not atomic.** Two genuinely different concurrent requests arriving at the exact same instant near the quota boundary could both pass the check before either inserts — a real race condition. A production-grade fix would use a single atomic SQL statement (e.g. a conditional `UPDATE ... WHERE current_usage + qty <= limit`) instead of separate read and write steps. Idempotency (same key twice) is NOT affected by this — that's enforced by a database unique constraint and is fully race-safe.
- Plan limits and token prices are arbitrary numbers I chose for this project, not real provider pricing.
- No invoicing, proration, or overage billing — out of scope per the assignment's core requirements.

## Evidence

See `EVIDENCE.md` for pasted proof of all 5 graded behavioral probes.

## AI Usage

See `BUILDLOG.md` for an honest log of where AI assistance helped, where it was wrong, and what was manually corrected.