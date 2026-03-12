/**
 * Error thrown when the SSE connection receives a non-OK HTTP response.
 * Preserves the HTTP status code for programmatic error handling.
 *
 * Lives outside the auto-generated `serverSentEvents.gen.ts` so that
 * running `pnpm run spec` (openapi-ts codegen) cannot silently remove it.
 */
export class SseError extends Error {
  statusCode: number;
  constructor(statusCode: number, statusText: string) {
    super(`SSE failed: ${statusCode} ${statusText}`);
    this.name = "SseError";
    this.statusCode = statusCode;
  }
}
