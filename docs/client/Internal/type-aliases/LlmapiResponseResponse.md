# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:1553](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1553)

## Properties

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1557](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1557)

ClientInjectedTools are tool names the client provided in the original request.

***

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:1561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1561)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:1562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1562)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1566)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1573](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1573)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1577](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1577)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:1581](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1581)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:1585](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1585)

Output is the array of output items (OpenAI Responses API format)

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1589](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1589)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:1593](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1593)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:1597](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1597)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:1598](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1598)
