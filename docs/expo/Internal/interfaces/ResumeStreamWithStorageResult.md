# ResumeStreamWithStorageResult

Defined in: [src/expo/useChatStorage.ts:350](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#350)

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

Defined in: [src/expo/useChatStorage.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#360)

The single reconciled assistant row, or null when nothing was persisted.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:351](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#351)

***

### error

> **error**: `string` | `null`

Defined in: [src/expo/useChatStorage.ts:352](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#352)

***

### expired?

> `optional` **expired**: `boolean`

Defined in: [src/expo/useChatStorage.ts:354](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#354)

True only for a 410: the buffer was gone and the stowed partial was finalized.

***

### interrupted?

> `optional` **interrupted**: `boolean`

Defined in: [src/expo/useChatStorage.ts:356](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#356)

True for an in-stream/tool-request terminal: replayed content finalized as stopped.

***

### statusCode?

> `optional` **statusCode**: `number`

Defined in: [src/expo/useChatStorage.ts:358](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#358)

HTTP status for a transient failure (e.g. 401) — retryable, handle retained.
