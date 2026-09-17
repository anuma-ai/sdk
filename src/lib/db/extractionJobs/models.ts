import { Model } from "@nozbe/watermelondb";

/** Device-local extraction outbox. Only source ids are stored here; message
 * contents remain in the encrypted history table. Never include in backups. */
export class ExtractionJob extends Model {
  static table = "memory_extraction_jobs";
}
