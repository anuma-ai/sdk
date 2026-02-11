# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:1022](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1022)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:1026](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1026)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:1027](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1027)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1031](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1031)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1038](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1038)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1042](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1042)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:1046](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1046)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:1050](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1050)

Output is the array of output items (OpenAI Responses API format)

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:1054](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1054)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:1058](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1058)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:1059](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1059)
