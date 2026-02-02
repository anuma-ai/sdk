# SendMessageWithStorageResult

> **SendMessageWithStorageResult** = { `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `data`: [`LlmapiResponseResponse`](../../../client/Internal/type-aliases/LlmapiResponseResponse.md) | [`LlmapiChatCompletionResponse`](../../../client/Internal/type-aliases/LlmapiChatCompletionResponse.md); `error`: `null`; `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); } | { `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); }

Defined in: [src/react/useChatStorage.ts:417](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L417)

Result from sendMessage with storage (React version)
The `data` field contains the raw server response which includes `tools_checksum`.
