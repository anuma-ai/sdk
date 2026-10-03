import type { FileProcessingReason, FileProcessingStatus } from "./types";

// Kept free of processor imports so the React Native entrypoint can export it without pulling
// the document parsers into the bundle.

/** Default `maxFileSizeBytes` for preprocessing. */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

/**
 * One line per file the model did NOT get, saying why — e.g.
 * `[order.pdf could not be read: the file is larger than 10 MB]`.
 *
 * Put these in the same `<attached_files>` part as the extracted contents so the model can tell
 * the user exactly which attachment it could not read instead of guessing ("an unreadable image
 * placeholder"). Returns null when every file was read.
 */
export function formatFileProcessingNotes(
  statuses: FileProcessingStatus[],
  options: { maxFileSizeBytes?: number } = {}
): string | null {
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const why: Record<FileProcessingReason, string> = {
    too_large: `the file is larger than ${formatMegabytes(maxFileSizeBytes)}`,
    unsupported_type: "its file type is not supported for reading",
    no_data: "its contents were not available to the app",
    empty: "no text or images could be extracted from it (it may be blank)",
    timeout: "reading it took too long and was stopped",
    error: "its text could not be extracted (it may be password-protected or damaged)",
  };
  const lines = statuses
    .filter((s) => s.status === "skipped" || s.status === "failed")
    .map((s) => `[${s.fileName} could not be read: ${why[s.reason ?? "error"]}]`);
  return lines.length > 0 ? lines.join("\n") : null;
}
