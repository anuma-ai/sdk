# ResumeStreamWithStorageResult

Defined in: [src/expo/useChatStorage.ts:533](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#533)

Result of `resumeStream` on the storage hook.

Mirrors the lib taxonomy onto the storage outcome:

* clean completion → `{ error: null, assistantMessage }`
* clean but EMPTY replay → `{ error: null, empty: true, assistantMessage }`
  (zero content replayed — the stowed partial is finalized as `wasStopped`;
  `assistantMessage` is null when there was no partial to fall back to)
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

Defined in: [src/expo/useChatStorage.ts:551](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#551)

The single reconciled assistant row, or null when nothing was persisted.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:534](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#534)

***

### empty?

> `optional` **empty**: `boolean`

Defined in: [src/expo/useChatStorage.ts:547](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#547)

True for a clean terminal whose replay carried NO content (a \[DONE]-only
replay — buffered frames lost server-side). The stowed partial was
finalized as `wasStopped` instead of the blank; nothing was persisted when
there was no partial. Callers should message this as an interruption, not
a successful restore.

***

### error

> **error**: `string` | `null`

Defined in: [src/expo/useChatStorage.ts:535](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#535)

***

### expired?

> `optional` **expired**: `boolean`

Defined in: [src/expo/useChatStorage.ts:537](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#537)

True only for a 410: the buffer was gone and the stowed partial was finalized.

***

### interrupted?

> `optional` **interrupted**: `boolean`

Defined in: [src/expo/useChatStorage.ts:539](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#539)

True for an in-stream/tool-request terminal: replayed content finalized as stopped.

***

### statusCode?

> `optional` **statusCode**: `number`

Defined in: [src/expo/useChatStorage.ts:549](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#549)

HTTP status for a transient failure (e.g. 401) — retryable, handle retained.
