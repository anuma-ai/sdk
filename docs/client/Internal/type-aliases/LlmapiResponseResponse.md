# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:1014](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1014)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:1018](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1018)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:1019](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1019)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1023](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1023)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1030](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1030)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1034](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1034)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:1038](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1038)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:1042](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1042)

Output is the array of output items (OpenAI Responses API format)

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:1046](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1046)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:1050](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1050)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:1051](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1051)
