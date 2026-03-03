# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:1383](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1383)

## Properties

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1387](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1387)

ClientInjectedTools are tool names the client provided in the original request.

***

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:1391](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1391)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:1392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1392)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1396](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1396)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1403](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1403)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1407](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1407)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:1411](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1411)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:1415](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1415)

Output is the array of output items (OpenAI Responses API format)

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1419](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1419)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:1423](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1423)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:1427](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1427)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:1428](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1428)
