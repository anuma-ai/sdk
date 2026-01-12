# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:174](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L174)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:178](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L178)

Choices contains the completion choices

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:179](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L179)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:183](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L183)

ID is the completion ID

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L190)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:194](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L194)

Model is the model used

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:195](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L195)
