# SendMessageWithStorageDetachedResult

Defined in: [src/expo/useChatStorage.ts:447](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#447)

Detached variant of the storage send result.

Returned only when `resumable` is on and the stream was torn down via
`detach()` before completing. The partial assistant row is already persisted
(under `assistantUniqueId`); call `resumeStream` with `handle` +
`assistantUniqueId` to complete that SAME row.

## Properties

### assistantUniqueId?

> `optional` **assistantUniqueId**: `string`

Defined in: [src/expo/useChatStorage.ts:462](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#462)

The id the resumed/expired/interrupted completion reconciles onto. Nothing
is persisted on detach — the row materializes when resumeStream() (or
stop()) finalizes the turn under this id.

Present whenever storage is active. Absent under `skipStorage`: there is no
persisted row to reconcile, so drive `resumeStream(resume)` on the handle
directly and manage the row yourself.

***

### data

> **data**: `ApiResponse` | `null`

Defined in: [src/expo/useChatStorage.ts:448](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#448)

***

### detached

> **detached**: `true`

Defined in: [src/expo/useChatStorage.ts:450](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#450)

***

### error

> **error**: `"Request detached"`

Defined in: [src/expo/useChatStorage.ts:449](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#449)

***

### resume

> **resume**: [`StreamResumeHandle`](../../../react/Internal/type-aliases/StreamResumeHandle.md) | `null`

Defined in: [src/expo/useChatStorage.ts:452](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#452)

Pass to `resumeStream` to replay; null when nothing was resumable.

***

### userMessage?

> `optional` **userMessage**: [`StoredMessage`](../../../react/Internal/interfaces/StoredMessage.md)

Defined in: [src/expo/useChatStorage.ts:464](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#464)

The persisted user message. Absent under `skipStorage` (nothing is stored).
