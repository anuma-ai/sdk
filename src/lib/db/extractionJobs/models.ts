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
 * observed sources into whatever scope was current. */
export class ExtractionJob extends Model {
  static table = "memory_extraction_jobs";
}
