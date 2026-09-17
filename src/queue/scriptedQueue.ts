import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Notice, NoticeQueue } from './NoticeQueue.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const notices: Notice[] = JSON.parse(
  readFileSync(path.join(here, '..', '..', 'fixtures', 'notices.json'), 'utf-8')
);

/**
 * Scripted, offline stand-in for a live venue feed. Do not modify.
 *
 * Yields notices in two bursts rather than one flat list: a batch on
 * connect, a pause, then a second batch. Notices from the second burst
 * may arrive while the first burst is still being processed. Two notices
 * are redelivered: one almost immediately (likely still in flight from its
 * first delivery), one well into the second burst (likely already
 * resolved by then).
 */
export class ScriptedNoticeQueue implements NoticeQueue {
  async *[Symbol.asyncIterator](): AsyncIterator<Notice> {
    const first = notices.slice(0, 12);
    const second = notices.slice(12);
    const redeliverSoon = notices.find((n) => n.id === 'N-001')!;
    const redeliverLater = notices.find((n) => n.id === 'N-006')!;

    for (const notice of first) yield notice;
    yield redeliverSoon;
    await delay(300);
    for (const notice of second) yield notice;
    yield redeliverLater;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
