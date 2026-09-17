# AiMi Take-Home: Notice Classifier Under Load

## Background

AiMi's agents ingest a live stream of operational notices from trading
venues and vendors, and classify each one for impact before it reaches a
human. In production that classification call goes to a hosted LLM -
which is sometimes slow, sometimes rate-limited under load, and
occasionally just hangs.

You will build a small pipeline that consumes a live feed of notices and
classifies each one through a scripted model client that reproduces those
failure modes. Everything runs locally: no cloud services, no API keys,
no network access required.

Time box: **2-3 hours**. We do not expect polish everywhere. Prioritise,
and note what you deliberately skipped in your NOTES.md.

## The task

Build a pipeline in TypeScript (Node 20+) that:

1. **Consumes** notices as they arrive from `ScriptedNoticeQueue`
   (`src/queue/scriptedQueue.ts`). This is a live feed, not a static list -
   it yields notices in bursts, and later notices may arrive while you are
   still processing earlier ones.
2. **Classifies** each notice by calling `FakeLLMClient.classify()`
   (`src/llm/fakeLLM.ts`). Every call must be given an `AbortSignal` and
   must respect it.
3. **Makes forward progress and recovers from failure**, transient and
   persistent alike. The fake client is not reliable: some calls never
   come back, some will never succeed no matter how many times you try,
   some fail a few times and then succeed, and the model's tolerance for
   concurrent load is not constant - it can get worse for a while,
   including periods where it rejects most calls outright regardless of
   how many you have in flight, before recovering. Your pipeline must
   never wait on a single call indefinitely, must never retry an
   unrecoverable notice forever, must always terminate, and should behave
   noticeably better under sustained failure than "retry immediately at
   full concurrency and hope." How you achieve all of that - and where
   you draw the line between "keep trying" and "give up" - is your
   design.
4. **Handles duplicate delivery.** A notice may arrive more than once,
   including while its first delivery is still being processed. At most
   one of those deliveries should result in a successful classification.
5. **Handles shutdown.** The process may receive `SIGTERM` while notices
   are still being processed. It should stop accepting new work, let
   in-flight work finish where reasonably possible, and exit cleanly. We
   may test this by starting your pipeline and terminating it partway
   through - there is no fixture for it, so if you run out of time,
   describe your intended approach in NOTES.md instead.
6. **Reports.** Once the queue is drained and every notice has reached a
   final state, print a run summary: how many notices were classified,
   how many could not be classified, and why.
7. **Is tested.** Cover your pipeline's decision logic with unit tests
   (`npm test`). See `test/fakeLLM.test.ts` for the pattern; test doubles
   for the model should implement the `LLMClient` interface.

### Self-check

`fixtures/notices.json` has 20 distinct notices, delivered 22 times (two
of them arrive twice - see `scriptedQueue.ts`). Of the 20, 3 are scripted
to never succeed (one hangs forever, two always fail) and the rest are
recoverable, however slowly. A correct implementation converges to **17
successfully classified notices and 3 that could not be classified** -
20 distinct outcomes, not 22, and no notice classified more than once.

## What is provided

| Path | What it is | May you change it? |
|---|---|---|
| `fixtures/notices.json` | 20 notice texts | No |
| `src/llm/LLMClient.ts` | The model interface your pipeline must depend on | No |
| `src/llm/fakeLLM.ts` | Scripted model client (deterministic, offline) | No |
| `src/llm/scriptedResponses.ts` | The fake's failure script | No |
| `src/llm/errors.ts` | Error types the fake throws | No |
| `src/queue/NoticeQueue.ts` | The feed interface your pipeline must depend on | No |
| `src/queue/scriptedQueue.ts` | Scripted live feed (deterministic, offline) | No |
| `src/index.ts` | Entry point stub | Yes - this is yours |
| `test/fakeLLM.test.ts` | Example tests documenting the fake's contract | Yes - add your own |

Everything else - module layout, how you decide to retry or give up,
how you detect and respond to a run of failures, concurrency, storage -
is yours to design. That design is a large part of what we review.

## Rules

- Do not modify `fixtures/`, `src/llm/LLMClient.ts`, `src/llm/fakeLLM.ts`,
  `src/llm/scriptedResponses.ts`, `src/llm/errors.ts`,
  `src/queue/NoticeQueue.ts`, or `src/queue/scriptedQueue.ts`. We grade by
  re-running your pipeline against pristine copies, and we may also run
  it against a differently scripted client and queue with the same
  interfaces and the same classes of failure - so do not special-case
  fixture ids, exact call counts, or exact timings.
- Any npm packages are fine.
- AI coding assistants are allowed (we use them too). You will walk us
  through your code in a follow-up conversation and should be able to
  explain and defend every decision in it.
- Write a `NOTES.md`: key decisions, tradeoffs, what you skipped due to
  the time box, and what you would change if the model client were a real
  hosted LLM behind a network call.

## Getting started

```bash
npm install
npm test           # example tests should pass out of the box
npm run pipeline   # your entry point
npm run typecheck  # tsc --noEmit
```

## Submission

- **Clone this repository - please do not fork it.** Forks of a public
  repository are public, and your solution should not be.
- Push your work, with its full commit history, to a new **private**
  repository on your own GitHub account.
- When you are done, invite the GitHub user `vswaroop04` as a collaborator
  so we can review. If you prefer, returning a zip archive is fine
  instead.
- Please do not publish your solution publicly - other candidates
  receive the same exercise.

Make sure `npm install && npm test && npm run pipeline` work on a clean
checkout with Node 20+.
