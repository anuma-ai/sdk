# SendMessageWithStorageResult

> **SendMessageWithStorageResult** = \{ `assistantMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); `data`: [`LlmapiChatCompletionResponse`](../../client/type-aliases/LlmapiChatCompletionResponse.md); `error`: `null`; `toolExecution?`: [`ToolExecutionResult`](../interfaces/ToolExecutionResult.md); `userMessage`: [`StoredMessage`](../interfaces/StoredMessage.md); \} \| \{ `assistantMessage?`: `undefined`; `data`: `null`; `error`: `string`; `toolExecution?`: [`ToolExecutionResult`](../interfaces/ToolExecutionResult.md); `userMessage?`: [`StoredMessage`](../interfaces/StoredMessage.md); \}

Defined in: [src/react/useChatStorage.ts:112](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L112)

Result from sendMessage with storage (React version)

Extends base result with tool execution information.
