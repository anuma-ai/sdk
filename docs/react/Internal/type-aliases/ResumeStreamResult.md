# ResumeStreamResult

> **ResumeStreamResult** = { `data`: `ApiResponse`; `empty?`: `boolean`; `error`: `null`; `interrupted`: `false`; } | { `data`: `ApiResponse` | `null`; `error`: `string`; `interrupted`: `boolean`; `statusCode?`: `number`; }

Defined in: [src/lib/chat/resumeStream.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#124)

Result of [resumeStream](../functions/resumeStream.md). A `410 Gone` is the only outcome that throws
([StreamExpiredError](../classes/StreamExpiredError.md)); every other terminal is returned.

* clean completion → `{ data, error: null, interrupted: false, empty }`
* in-stream error / tool-request terminal / idle timeout → `{ data, error,
  interrupted: true }` (finalize as a stopped/partial message)
* transient transport/HTTP failure (401, 5xx, network) → `{ data, error,
  interrupted: false, statusCode? }` (retryable — keep the handle)

`empty` is true when the clean terminal delivered ZERO content/thinking
deltas — a `[DONE]`-only replay. That is never a real completion (a
completed generation always buffered at least one content frame); it means
the buffered frames were lost server-side (evicted/trimmed) while the
terminal survived. Consumers must NOT persist `data` (an empty response)
over content they already hold — keep the detached partial instead. On the
empty terminal `onFinish` is NOT fired (there is no completion to deliver);
the flag is optional so existing constructors of the clean arm stay valid.
