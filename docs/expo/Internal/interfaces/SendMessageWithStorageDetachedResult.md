# SendMessageWithStorageDetachedResult

Defined in: [src/expo/useChatStorage.ts:440](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#440)

Detached variant of the storage send result.

Returned only when `resumable` is on and the stream was torn down via
`detach()` before completing. The partial assistant row is already persisted
(under `assistantUniqueId`); call `resumeStream` with `handle` +
`assistantUniqueId` to complete that SAME row.

## Properties

### assistantUniqueId?

> `optional` **assistantUniqueId**: `string`

Defined in: [src/expo/useChatStorage.ts:455](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#455)

The id the resumed/expired/interrupted completion reconciles onto. Nothing
is persisted on detach — the row materializes when resumeStream() (or
stop()) finalizes the turn under this id.

Present whenever storage is active. Absent under `skipStorage`: there is no
persisted row to reconcile, so drive `resumeStream(resume)` on the handle
directly and manage the row yourself.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:441](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#441)

***

### detached

> **detached**: `true`

Defined in: [src/expo/useChatStorage.ts:443](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#443)

***

### error

> **error**: `"Request detached"`

Defined in: [src/expo/useChatStorage.ts:442](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#442)

***

### resume

> **resume**: [`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md) | `null`

Defined in: [src/expo/useChatStorage.ts:445](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#445)

Pass to `resumeStream` to replay; null when nothing was resumable.

***

### userMessage?

> `optional` **userMessage**: [`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)

Defined in: [src/expo/useChatStorage.ts:457](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#457)

The persisted user message. Absent under `skipStorage` (nothing is stored).
