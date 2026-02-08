# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:372](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L372)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:376](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L376)

Choices contains the completion choices

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:377](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L377)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:381](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L381)

ID is the completion ID

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:388](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L388)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:392](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L392)

Model is the model used

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:396](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L396)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:397](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L397)
