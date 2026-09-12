# Build Log — AI Usage Honesty

## Where AI (Claude) helped
- Scaffolding the layered architecture (routes → services → repositories), consistent with patterns from earlier assignments.
- Writing the idempotency logic using a DB-level unique constraint (`ON CONFLICT DO NOTHING`) instead of a check-then-insert pattern, which avoids a race condition a naive approach would have.
- Stripe integration: Checkout session creation, webhook signature verification, and raw-body middleware ordering (webhook route must be registered before `express.json()` — this is a genuinely easy mistake to make and AI caught it upfront).
- Diagnosing a real runtime bug where `stripe.customers` was `undefined` despite the code looking correct — root cause was never fully confirmed (likely a hidden/invisible character or stale module cache in the original file), but rewriting the file from scratch fixed it. This is documented as an unresolved root cause, not a solved one.

## Where AI was wrong or had to be corrected
- Initially assumed a specific `winget` package ID (`stripe.stripe-cli`) that turned out not to match what winget actually had registered — had to fall back to a manual GitHub download instead.
- Assumed `stripe events resend <event_id>` was a reliable CLI command for testing webhook replay without confirming it against the installed CLI version — pivoted to a direct-call test script instead, which is more reliable and just as valid a test of the dedupe logic.
- Early guidance for creating a Stripe product assumed a stable dashboard UI location ("Product catalog" page); the actual Stripe dashboard navigation didn't match, and multiple attempts were needed before switching to the Stripe CLI (`stripe products create` / `stripe prices create`) instead, which was more reliable.

## What I (the developer) decided/assumed myself
- Free plan: 100 api_calls / 5,000 tokens per month. Pro plan: 10,000 api_calls / 500,000 tokens, $20/month. These numbers are arbitrary, chosen for easy testing, not based on real cost analysis.
- Token pricing tiers (input/cached_input/output/reasoning) are simulated rates, not pulled from any real provider's actual pricing.
- Auth model: a simple per-tenant API key header, not full user authentication — scoped deliberately since this capstone is about metering/billing, not auth.