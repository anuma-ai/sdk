# SendMessageWithStorageResult

> **SendMessageWithStorageResult** = \{ `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `data`: [`LlmapiChatCompletionResponse`](../../client/type-aliases/LlmapiChatCompletionResponse.md); `error`: `null`; `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); \} \| \{ `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); \}

Defined in: [src/react/useChatStorage.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L89)

Result from sendMessage with storage (React version)
