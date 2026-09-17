import type { ClassifyRequest, ClassifyResult, LLMClient } from './LLMClient.js';
import { PermanentLLMError, RateLimitedError, TransientLLMError } from './errors.js';
import { HEALTH_TIMELINE, SCRIPT, type HealthPhase } from './scriptedResponses.js';

/**
 * Deterministic, offline stand-in for a hosted model. Do not modify.
 *
 * Reproduces four real failure modes of hosted LLMs: a call that never
 * comes back, a call that will never succeed, a call that is fine on its
 * own but fails when too many others are in flight at the same time, and a
 * period of broad degradation independent of concurrency.
 */
export class FakeLLMClient implements LLMClient {
  #inFlight = 0;
  #totalCalls = 0;
  #attemptCounts = new Map<string, number>();

  async classify(req: ClassifyRequest, signal: AbortSignal): Promise<ClassifyResult> {
    if (signal.aborted) throw abortError();

    const callIndex = this.#totalCalls++;
    this.#inFlight++;
    try {
      const phase = currentPhase(callIndex);

      if (phase.outageRate !== undefined && noticeHash(req.noticeId) < phase.outageRate * 100) {
        throw new RateLimitedError(`model degraded, rejecting ${req.noticeId}`);
      }

      if (this.#inFlight > phase.safeConcurrency) {
        throw new RateLimitedError(
          `rate limited: ${this.#inFlight} calls in flight for ${req.noticeId}`
        );
      }

      const script = SCRIPT[req.noticeId] ?? { kind: 'ok' as const };

      if (script.kind === 'hang') {
        return await new Promise<ClassifyResult>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(abortError()), { once: true });
        });
      }

      await delay(20 + Math.round(Math.random() * 60), signal);

      if (script.kind === 'permanent') {
        throw new PermanentLLMError(`notice ${req.noticeId} cannot be classified`);
      }

      if (script.kind === 'flaky') {
        const attempts = (this.#attemptCounts.get(req.noticeId) ?? 0) + 1;
        this.#attemptCounts.set(req.noticeId, attempts);
        if (attempts <= script.failTimes) {
          throw new TransientLLMError(`transient failure on attempt ${attempts} for ${req.noticeId}`);
        }
      }

      return {
        noticeId: req.noticeId,
        severity: pickSeverity(req.text),
        summary: req.text.slice(0, 80),
      };
    } finally {
      this.#inFlight--;
    }
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true }
    );
  });
}

function abortError(): Error {
  return new DOMException('The operation was aborted', 'AbortError');
}

function currentPhase(callIndex: number): HealthPhase {
  let phase = HEALTH_TIMELINE[0]!;
  for (const candidate of HEALTH_TIMELINE) {
    if (callIndex >= candidate.fromCallIndex) phase = candidate;
  }
  return phase;
}

function noticeHash(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 100;
}

function pickSeverity(text: string): ClassifyResult['severity'] {
  const levels: ClassifyResult['severity'][] = ['low', 'medium', 'high', 'critical'];
  return levels[text.length % levels.length]!;
}
