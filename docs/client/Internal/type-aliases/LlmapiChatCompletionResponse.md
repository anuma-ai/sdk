# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:255](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L255)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:259](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L259)

Choices contains the completion choices

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:260](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L260)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:264](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L264)

ID is the completion ID

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:271](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L271)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:275](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L275)

Model is the model used

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:276](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L276)
