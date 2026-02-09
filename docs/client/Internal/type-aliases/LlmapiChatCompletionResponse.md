# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:475](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L475)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:479](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L479)

Choices contains the completion choices

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:480](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L480)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:484](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L484)

ID is the completion ID

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:491](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L491)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:495](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L495)

Model is the model used

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:499](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L499)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:503](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L503)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:504](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L504)
