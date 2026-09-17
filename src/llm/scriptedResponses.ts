/**
 * The fake's failure script, keyed by notice id. Do not special-case these
 * ids in your pipeline logic - grading may re-run your solution against a
 * client with a different script and a different health timeline, but the
 * same classes of failure:
 *
 *  - one notice that hangs forever unless the call is aborted
 *  - a few notices that always fail, no matter how many times you retry
 *  - a few notices that fail a small, fixed number of times, then succeed
 *  - a rate-limit style failure once too many calls are in flight at once
 *  - a period where the model is broadly degraded, independent of how many
 *    calls you have in flight
 */
export type ScriptEntry =
  | { kind: 'ok' }
  | { kind: 'hang' }
  | { kind: 'permanent' }
  | { kind: 'flaky'; failTimes: number };

export const SCRIPT: Record<string, ScriptEntry> = {
  'N-004': { kind: 'hang' },
  'N-011': { kind: 'permanent' },
  'N-017': { kind: 'permanent' },
  'N-002': { kind: 'flaky', failTimes: 2 },
  'N-009': { kind: 'flaky', failTimes: 2 },
  'N-014': { kind: 'flaky', failTimes: 1 },
};

/**
 * The model's tolerance for load is not constant. Each phase applies from
 * its `fromCallIndex` (the Nth call made to the client, across all notices,
 * 0-indexed) until the next phase starts. `outageRate`, when set, is the
 * fraction of notices the model rejects outright during that phase,
 * independent of `safeConcurrency` - a broad degradation, not just a
 * concurrency limit.
 */
export interface HealthPhase {
  fromCallIndex: number;
  safeConcurrency: number;
  outageRate?: number;
}

export const HEALTH_TIMELINE: HealthPhase[] = [
  { fromCallIndex: 0, safeConcurrency: 5 },
  { fromCallIndex: 12, safeConcurrency: 2 },
  { fromCallIndex: 16, safeConcurrency: 2, outageRate: 0.8 },
  { fromCallIndex: 24, safeConcurrency: 2 },
  { fromCallIndex: 30, safeConcurrency: 5 },
];
