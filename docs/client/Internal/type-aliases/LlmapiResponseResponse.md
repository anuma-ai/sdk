# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:962](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L962)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:966](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L966)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:967](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L967)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:971](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L971)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:978](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L978)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:982](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L982)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:986](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L986)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:990](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L990)

Output is the array of output items (OpenAI Responses API format)

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:994](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L994)

ToolCallEvents contains the server-side MCP tool execution events

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:998](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L998)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:999](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L999)
