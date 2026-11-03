# SendMessageWithStorageDetachedResult

Defined in: [src/expo/useChatStorage.ts:427](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#427)

Detached variant of the storage send result.

Returned only when `resumable` is on and the stream was torn down via

## Properties

### assistantUniqueId?

> `optional` **assistantUniqueId**: `string`

Defined in: [src/expo/useChatStorage.ts:439](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#439)

Present whenever storage is active. Absent under `skipStorage`: there is no
persisted row to reconcile, so drive `resumeStream(resume)` on the handle
directly and manage the row yourself.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:428](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#428)

***

### detached

> **detached**: `true`

Defined in: [src/expo/useChatStorage.ts:430](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#430)

***

### error

> **error**: `"Request detached"`

Defined in: [src/expo/useChatStorage.ts:429](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#429)

***

### resume

> **resume**: [`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md) | `null`

Defined in: [src/expo/useChatStorage.ts:432](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#432)

Pass to `resumeStream` to replay; null when nothing was resumable.

***

### userMessage?

> `optional` **userMessage**: [`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)

Defined in: [src/expo/useChatStorage.ts:441](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#441)

The persisted user message. Absent under `skipStorage` (nothing is stored).
