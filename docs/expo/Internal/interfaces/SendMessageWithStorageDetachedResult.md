# SendMessageWithStorageDetachedResult

Defined in: [src/expo/useChatStorage.ts:449](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#449)

Detached variant of the storage send result.

Returned only when `resumable` is on and the stream was torn down via

## Properties

### assistantUniqueId?

> `optional` **assistantUniqueId**: `string`

Defined in: [src/expo/useChatStorage.ts:461](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#461)

Present whenever storage is active. Absent under `skipStorage`: there is no
persisted row to reconcile, so drive `resumeStream(resume)` on the handle
directly and manage the row yourself.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:450](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#450)

***

### detached

> **detached**: `true`

Defined in: [src/expo/useChatStorage.ts:452](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#452)

***

### error

> **error**: `"Request detached"`

Defined in: [src/expo/useChatStorage.ts:451](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#451)

***

### resume

> **resume**: [`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md) | `null`

Defined in: [src/expo/useChatStorage.ts:454](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#454)

Pass to `resumeStream` to replay; null when nothing was resumable.

***

### userMessage?

> `optional` **userMessage**: [`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)

Defined in: [src/expo/useChatStorage.ts:463](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#463)

The persisted user message. Absent under `skipStorage` (nothing is stored).
