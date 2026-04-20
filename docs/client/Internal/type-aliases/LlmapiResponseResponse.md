# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:1976](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1976)

## Properties

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1980](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1980)

ClientInjectedTools are tool names the client provided in the original request.

***

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:1984](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1984)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:1985](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1985)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1989](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1989)

ID is the unique response identifier

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1995](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1995)

ImageModel is set when an image generation tool was called during the request.
This allows the client to detect that the response contains generated images
and render them appropriately, even when the orchestrating model is a text model.

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:2002](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2002)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:2006](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2006)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:2010](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2010)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:2014](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2014)

Output is the array of output items (OpenAI Responses API format)

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:2018](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2018)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:2022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2022)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:2026](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2026)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:2027](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2027)
