# Evidence of Requirements Met

## Probe 1 — Idempotency (same key twice → one event)

First call:

HTTP/1.1 201 Created
{"id":1,"tenant_id":1,"idempotency_key":"test-key-1","event_type":"api_call","payload":{},"units_used":1,"cost_cents":1,"created_at":"2026-09-12T...","replayed":false}


Second call, exact same Idempotency-Key:

HTTP/1.1 200 OK
{"id":1,...same row...,"replayed":true}

Same `id:1` both times — no duplicate row created, no double charge.

## Probe 2 — Quota Boundary (429 at exact limit)

Free plan limit = 100 api_calls/month. 1 call already used from Probe 1 test.
Ran 105 requests with distinct Idempotency-Keys:

94 : 201
95 : 201
96 : 201
97 : 201
98 : 201
99 : 201
100 : 429
101 : 429
...
105 : 429

Request 99 (cumulative 100th call) → allowed. Request 100 (cumulative 101st) → correctly rejected.

## Probe 3 — Stripe Checkout → Webhook → Plan Upgrade

Checkout session created:

{"checkout_url":"https://checkout.stripe.com/c/pay/cs_test_..."}

Completed with test card 4242 4242 4242 4242. Stripe CLI log confirmed:

--> checkout.session.completed [evt_...]
<-- [200] POST http://localhost:3000/webhooks/stripe [evt_...]

Confirmed via GET /usage:

{"plan":"pro","api_calls":{"used":100,"limit":10000},"ai_tokens":{"used":0,"limit":500000}}

Plan flipped from free → pro automatically, limits updated.

## Probe 4 — Forged Signature Rejected + Replay Deduped

Forged signature:

curl -X POST /webhooks/stripe -H "Stripe-Signature: t=1,v1=fakebadsignature123" ...
HTTP/1.1 400 Bad Request
{"error":"Webhook signature verification failed: No signatures found matching the expected signature..."}


Replay dedupe (direct handler test, since the CLI's `stripe events resend` support was uncertain for this version):

First call: { alreadyProcessed: false }
Second call (same event id): { alreadyProcessed: true }


## Probe 5 — Token Pricing Math

Request:
```json
{"event_type":"ai_tokens","payload":{"input":10000,"cached_input":10000,"output":10000,"reasoning":10000}}
```
Expected: (10000×0.5 + 10000×0.25 + 10000×1.5 + 10000×1.5) / 1000 = 37.5 → rounds to 38 cents, 40000 units.

Actual response:

{"id":101,...,"units_used":40000,"cost_cents":38,"replayed":false}

Matches exactly.

## Background Job

Startup log:

Reconciliation background job started — running every 60s

Runs on a timer, independent of any HTTP request, reconciles Pro tenants' subscription_status against Stripe, retries up to 3x with a logged ALERT on permanent failure.