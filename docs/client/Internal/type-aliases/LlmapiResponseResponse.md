# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:951](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L951)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:955](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L955)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:956](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L956)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:960](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L960)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:967](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L967)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:971](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L971)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:975](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L975)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:979](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L979)

Output is the array of output items (OpenAI Responses API format)

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:983](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L983)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:987](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L987)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:988](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L988)
