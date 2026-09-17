import { describe, expect, it } from 'vitest';
import { FakeLLMClient } from '../src/llm/fakeLLM.js';
import { PermanentLLMError } from '../src/llm/errors.js';

// Documents the fake's contract. Add your own tests for how your pipeline
// decides what to do when a call fails - this file just shows how the
// model boundary behaves in isolation.

describe('FakeLLMClient contract', () => {
  it('classifies a normal notice', async () => {
    const client = new FakeLLMClient();
    const controller = new AbortController();

    const result = await client.classify(
      { noticeId: 'N-001', text: 'Fee schedule update' },
      controller.signal
    );

    expect(result.noticeId).toBe('N-001');
    expect(result.severity).toBeDefined();
  });

  it('never resolves a hanging notice unless the call is aborted', async () => {
    const client = new FakeLLMClient();
    const controller = new AbortController();

    let settled = false;
    const promise = client
      .classify({ noticeId: 'N-004', text: 'irrelevant' }, controller.signal)
      .finally(() => {
        settled = true;
      });
    promise.catch(() => {});

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(settled).toBe(false);

    controller.abort();
    await expect(promise).rejects.toThrow();
  });

  it('fails a permanent notice on every attempt', async () => {
    const client = new FakeLLMClient();
    const controller = new AbortController();

    await expect(
      client.classify({ noticeId: 'N-011', text: 'irrelevant' }, controller.signal)
    ).rejects.toThrow(PermanentLLMError);
    await expect(
      client.classify({ noticeId: 'N-011', text: 'irrelevant' }, controller.signal)
    ).rejects.toThrow(PermanentLLMError);
  });

  it('eventually succeeds a flaky notice after enough attempts', async () => {
    const client = new FakeLLMClient();
    const controller = new AbortController();

    // N-014 is scripted to fail once, then succeed.
    await expect(
      client.classify({ noticeId: 'N-014', text: 'irrelevant' }, controller.signal)
    ).rejects.toThrow();

    const result = await client.classify(
      { noticeId: 'N-014', text: 'irrelevant' },
      controller.signal
    );
    expect(result.noticeId).toBe('N-014');
  });

  it('degrades broadly after enough calls, independent of concurrency', async () => {
    const client = new FakeLLMClient();
    const controller = new AbortController();

    // Drive the call count into a later health phase one call at a time
    // (concurrency 1 throughout), using notices with no other scripted
    // behaviour so only the health timeline is in play.
    const plain = ['N-003', 'N-005', 'N-007', 'N-008', 'N-010'];
    let sawFailureWithNoConcurrency = false;

    for (let round = 0; round < 6; round++) {
      for (const id of plain) {
        try {
          await client.classify({ noticeId: id, text: 'irrelevant' }, controller.signal);
        } catch {
          sawFailureWithNoConcurrency = true;
        }
      }
    }

    expect(sawFailureWithNoConcurrency).toBe(true);
  });
});
