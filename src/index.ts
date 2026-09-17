// Entry point - this is yours.
//
// Consume `ScriptedNoticeQueue` as notices arrive, classify each one
// through `FakeLLMClient` behind whatever resilience layer you build
// (timeouts, retry, circuit breaker, bounded concurrency), and print a
// run summary once the queue is drained and every notice has reached a
// final state (classified or dead-lettered).

import { FakeLLMClient } from './llm/fakeLLM.js';
import { ScriptedNoticeQueue } from './queue/scriptedQueue.js';

async function main() {
  const queue = new ScriptedNoticeQueue();
  const llm = new FakeLLMClient();

  // TODO: build your pipeline.
  void queue;
  void llm;
}

main();
