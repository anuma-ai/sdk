# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:1327](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1327)

## Properties

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1331)

ClientInjectedTools are tool names the client provided in the original request.

***

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:1335](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1335)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:1336](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1336)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1340](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1340)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1347)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1351)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:1355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1355)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:1359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1359)

Output is the array of output items (OpenAI Responses API format)

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1363](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1363)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:1367](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1367)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:1371](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1371)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:1372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1372)
