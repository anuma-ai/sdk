# ResumeStreamWithStorageResult

Defined in: [src/expo/useChatStorage.ts:485](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#485)

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

Defined in: [src/expo/useChatStorage.ts:503](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#503)

The single reconciled assistant row, or null when nothing was persisted.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:486](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#486)

***

### empty?

> `optional` **empty**: `boolean`

Defined in: [src/expo/useChatStorage.ts:499](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#499)

True for a clean terminal whose replay carried NO content (a \[DONE]-only
replay — buffered frames lost server-side). The stowed partial was
finalized as `wasStopped` instead of the blank; nothing was persisted when
there was no partial. Callers should message this as an interruption, not
a successful restore.

***

### error

> **error**: `string` | `null`

Defined in: [src/expo/useChatStorage.ts:487](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#487)

***

### expired?

> `optional` **expired**: `boolean`

Defined in: [src/expo/useChatStorage.ts:489](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#489)

True only for a 410: the buffer was gone and the stowed partial was finalized.

***

### interrupted?

> `optional` **interrupted**: `boolean`

Defined in: [src/expo/useChatStorage.ts:491](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#491)

True for an in-stream/tool-request terminal: replayed content finalized as stopped.

***

### statusCode?

> `optional` **statusCode**: `number`

Defined in: [src/expo/useChatStorage.ts:501](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#501)

HTTP status for a transient failure (e.g. 401) — retryable, handle retained.
