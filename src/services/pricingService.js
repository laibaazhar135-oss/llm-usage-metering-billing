// ASSUMPTION — documented in README, not looked up from a real provider:
// Prices are cents per 1,000 tokens. Reasoning tokens are billed at the OUTPUT rate —
// a common real-world trap is treating "reasoning" as free scratch space. It is not free.
const TOKEN_PRICE_PER_1K_CENTS = {
  input: 0.5,
  cached_input: 0.25, // cached input is cheaper — real providers do this
  output: 1.5,
  reasoning: 1.5
};

const API_CALL_FLAT_COST_CENTS = 1;

function calculate(eventType, payload = {}) {
  if (eventType === 'api_call') {
    return { costCents: API_CALL_FLAT_COST_CENTS, unitsUsed: 1 };
  }

  if (eventType === 'ai_tokens') {
    const { input = 0, cached_input = 0, output = 0, reasoning = 0 } = payload;

    // Money must always be an integer number of cents — never a float.
    // We compute in fractional cents, then round ONCE at the end.
    const rawCents =
      (input * TOKEN_PRICE_PER_1K_CENTS.input +
        cached_input * TOKEN_PRICE_PER_1K_CENTS.cached_input +
        output * TOKEN_PRICE_PER_1K_CENTS.output +
        reasoning * TOKEN_PRICE_PER_1K_CENTS.reasoning) / 1000;

    return {
      costCents: Math.round(rawCents),
      unitsUsed: input + cached_input + output + reasoning
    };
  }

  const err = new Error(`Unknown event_type: ${eventType}`);
  err.statusCode = 400;
  throw err;
}

module.exports = { calculate, TOKEN_PRICE_PER_1K_CENTS, API_CALL_FLAT_COST_CENTS };