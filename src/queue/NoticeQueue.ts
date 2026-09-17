export interface Notice {
  id: string;
  text: string;
}

/** A live feed of notices, not a static list - notices may still be arriving
 * while others are in flight or already classified. */
export type NoticeQueue = AsyncIterable<Notice>;
