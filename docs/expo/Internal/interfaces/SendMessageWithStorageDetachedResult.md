# SendMessageWithStorageDetachedResult

Defined in: [src/expo/useChatStorage.ts:443](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#443)

Detached variant of the storage send result.

Returned only when `resumable` is on and the stream was torn down via

## Properties

### assistantUniqueId?

> `optional` **assistantUniqueId**: `string`

Defined in: [src/expo/useChatStorage.ts:455](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#455)

Present whenever storage is active. Absent under `skipStorage`: there is no
persisted row to reconcile, so drive `resumeStream(resume)` on the handle
directly and manage the row yourself.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:444](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#444)

***

### detached

> **detached**: `true`

Defined in: [src/expo/useChatStorage.ts:446](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#446)

***

### error

> **error**: `"Request detached"`

Defined in: [src/expo/useChatStorage.ts:445](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#445)

***

### resume

> **resume**: [`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md) | `null`

Defined in: [src/expo/useChatStorage.ts:448](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#448)

Pass to `resumeStream` to replay; null when nothing was resumable.

***

### userMessage?

> `optional` **userMessage**: [`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)

Defined in: [src/expo/useChatStorage.ts:457](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#457)

The persisted user message. Absent under `skipStorage` (nothing is stored).
