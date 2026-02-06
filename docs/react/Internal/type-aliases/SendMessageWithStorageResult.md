# SendMessageWithStorageResult

> **SendMessageWithStorageResult** = { `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `data`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md) | [`LlmapiChatCompletionResponse`](../../../client/Internal/type-aliases/LlmapiChatCompletionResponse.md); `error`: `null`; `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); } | { `assistantMessage?`: `undefined`; `data`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md) | [`LlmapiChatCompletionResponse`](../../../client/Internal/type-aliases/LlmapiChatCompletionResponse.md); `error`: `null`; `skipped`: `true`; `userMessage?`: `undefined`; } | { `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); }

Defined in: [src/react/useChatStorage.ts:264](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L264)

Result from sendMessage with storage (React version)
The `data` field contains the raw server response which includes `tools_checksum`.

## Type Declaration

{ `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `data`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md) | [`LlmapiChatCompletionResponse`](../../../client/Internal/type-aliases/LlmapiChatCompletionResponse.md); `error`: `null`; `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); }

### assistantMessage

> **assistantMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)

### data

> **data**: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md) | [`LlmapiChatCompletionResponse`](../../../client/Internal/type-aliases/LlmapiChatCompletionResponse.md)

### error

> **error**: `null`

### userMessage

> **userMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)

{ `assistantMessage?`: `undefined`; `data`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md) | [`LlmapiChatCompletionResponse`](../../../client/Internal/type-aliases/LlmapiChatCompletionResponse.md); `error`: `null`; `skipped`: `true`; `userMessage?`: `undefined`; }

### assistantMessage?

> `optional` **assistantMessage**: `undefined`

### data

> **data**: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md) | [`LlmapiChatCompletionResponse`](../../../client/Internal/type-aliases/LlmapiChatCompletionResponse.md)

### error

> **error**: `null`

### skipped

> **skipped**: `true`

Indicates this was a skipStorage request - no messages were persisted

### userMessage?

> `optional` **userMessage**: `undefined`

{ `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); }

### assistantMessage?

> `optional` **assistantMessage**: `undefined`

### data

> **data**: `null`

### error

> **error**: `string`

### userMessage?

> `optional` **userMessage**: [`StoredMessage`](../interfaces/StoredMessage.md)
