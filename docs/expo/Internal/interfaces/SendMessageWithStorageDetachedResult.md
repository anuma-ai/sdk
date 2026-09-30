# SendMessageWithStorageDetachedResult

Defined in: [src/expo/useChatStorage.ts:500](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#500)

Detached variant of the storage send result.

Returned only when `resumable` is on and the stream was torn down via
`detach()` before the terminal. The hook keeps the partial in memory.
Call `resumeStream` to save the completed row under `assistantUniqueId`.
A new send saves the partial as a stopped row and cancels the old buffer.

## Properties

### assistantUniqueId?

> `optional` **assistantUniqueId**: `string`

Defined in: [src/expo/useChatStorage.ts:514](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#514)

The id for the completed or stopped row. Detach saves no row.
A resume, stop, or new send saves the row under this id.

Present whenever storage is active. Absent under `skipStorage`: there is no
persisted row to reconcile, so drive `resumeStream(resume)` on the handle
directly and manage the row yourself.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:501](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#501)

***

### detached

> **detached**: `true`

Defined in: [src/expo/useChatStorage.ts:503](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#503)

***

### error

> **error**: `"Request detached"`

Defined in: [src/expo/useChatStorage.ts:502](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#502)

***

### resume

> **resume**: [`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md) | `null`

Defined in: [src/expo/useChatStorage.ts:505](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#505)

Pass to `resumeStream` to replay; null when nothing was resumable.

***

### userMessage?

> `optional` **userMessage**: [`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)

Defined in: [src/expo/useChatStorage.ts:516](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#516)

The persisted user message. Absent under `skipStorage` (nothing is stored).
