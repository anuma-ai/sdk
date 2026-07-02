# ResumeStreamWithStorageResult

Defined in: [src/expo/useChatStorage.ts:449](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#449)

Result of `resumeStream` on the storage hook.

Mirrors the lib taxonomy onto the storage outcome:

* clean completion → `{ error: null, assistantMessage }`
* 410 expired → `{ error: null, expired: true, assistantMessage }` (the
  stowed partial is finalized as `wasStopped`)
* in-stream-interrupted → `{ error: <message>, interrupted: true,
  assistantMessage }` (replayed content finalized as `wasStopped`)
* transient (401/network) → `{ error, statusCode, assistantMessage: null }`
  — nothing persisted, the handle is RETAINED for retry
* no resumable stream → `{ error: "No resumable stream", assistantMessage: null }`

## Properties

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md) | `null`

Defined in: [src/expo/useChatStorage.ts:459](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#459)

The single reconciled assistant row, or null when nothing was persisted.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:450](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#450)

***

### error

> **error**: `string` | `null`

Defined in: [src/expo/useChatStorage.ts:451](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#451)

***

### expired?

> `optional` **expired**: `boolean`

Defined in: [src/expo/useChatStorage.ts:453](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#453)

True only for a 410: the buffer was gone and the stowed partial was finalized.

***

### interrupted?

> `optional` **interrupted**: `boolean`

Defined in: [src/expo/useChatStorage.ts:455](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#455)

True for an in-stream/tool-request terminal: replayed content finalized as stopped.

***

### statusCode?

> `optional` **statusCode**: `number`

Defined in: [src/expo/useChatStorage.ts:457](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#457)

HTTP status for a transient failure (e.g. 401) — retryable, handle retained.
