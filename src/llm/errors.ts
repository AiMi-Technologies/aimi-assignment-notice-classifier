/** Base class for a call that is safe to retry. */
export class TransientLLMError extends Error {
  readonly retryable = true as const;
}

/** Base class for a call that will never succeed no matter how often you retry it. */
export class PermanentLLMError extends Error {
  readonly retryable = false as const;
}

/** A specific, common transient failure: too many concurrent calls in flight. */
export class RateLimitedError extends TransientLLMError {}
