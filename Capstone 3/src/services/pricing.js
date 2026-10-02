export function calculateTokenCost(tokens, plan) {
  const { inputTokens, cachedInputTokens, outputTokens, reasoningTokens } = tokens;

  let costCents = 0;
  costCents += Math.floor(inputTokens / 1_000_000) * plan.price_input_tokens_cents;
  costCents += Math.floor(cachedInputTokens / 1_000_000) * plan.price_cached_input_tokens_cents;
  costCents += Math.floor(outputTokens / 1_000_000) * plan.price_output_tokens_cents;
  costCents += Math.floor(reasoningTokens / 1_000_000) * plan.price_reasoning_tokens_cents;

  return costCents;
}

export function validateTokenBreakdown(tokens) {
  if (tokens.cachedInputTokens > tokens.inputTokens) {
    throw new Error('Cached input tokens cannot exceed total input tokens');
  }
}