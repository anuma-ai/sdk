# ResumeStreamResult

> **ResumeStreamResult** = { `data`: `ApiResponse`; `error`: `null`; `interrupted`: `false`; } | { `data`: `ApiResponse` | `null`; `error`: `string`; `interrupted`: `boolean`; `statusCode?`: `number`; }

Defined in: [src/lib/chat/resumeStream.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#115)

Result of [resumeStream](../functions/resumeStream.md). A `410 Gone` is the only outcome that throws
([StreamExpiredError](../classes/StreamExpiredError.md)); every other terminal is returned.

* clean completion → `{ data, error: null, interrupted: false }`
* in-stream error / tool-request terminal / idle timeout → `{ data, error,
  interrupted: true }` (finalize as a stopped/partial message)
* transient transport/HTTP failure (401, 5xx, network) → `{ data, error,
  interrupted: false, statusCode? }` (retryable — keep the handle)
