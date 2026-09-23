import { Model } from "@nozbe/watermelondb";

/** Device-local extraction outbox. Only source ids are stored here; message
 * contents remain in the encrypted history table.
 *
 * Deliberately excluded from backup and restore. Nothing enforces that today
 * beyond the shape of the exporters — every backup path exports per
 * conversation and none of them walks this table — so a future whole-database
 * exporter has to skip it explicitly. Restoring an outbox would re-enqueue
 * another device's source ids against local history.
 *
 * `watermark` (the newest acknowledged source id) is paired with
 * `watermark_seq` (that message's `history.message_id`) because the id alone
 * is not a durable anchor: `message_id` is assigned max+1 per conversation and
 * never reused, so the sequence survives the deletion of the message that set
 * it. Resolving the boundary from the id alone meant deleting one message
 * erased the anchor, and the trailing-window fallback then re-enqueued already
 * observed sources into whatever scope was current.
 *
 * `failed_sessions` counts the worker sessions in which the job's head batch
 * (the oldest source ids, read 20 at a time) failed to extract; `failed_head`
 * is the first id of the batch that count belongs to, so a count never carries
 * over to a different batch after the head is acknowledged, dropped or pruned.
 * `failed_at` is when the last failed session was counted: sessions closer
 * together than an hour count once. Past the limit the batch is abandoned so
 * later messages still extract. */
export class ExtractionJob extends Model {
  static table = "memory_extraction_jobs";
}
