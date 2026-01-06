# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:133](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L133)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)[]

Defined in: [src/client/types.gen.ts:137](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L137)

Choices contains the completion choices

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L138)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L142)

ID is the completion ID

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)[]

Defined in: [src/client/types.gen.ts:149](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L149)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:153](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L153)

Model is the model used

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L154)
