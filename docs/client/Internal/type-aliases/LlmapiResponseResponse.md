# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:862](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#862)

## Properties

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:866](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#866)

ClientInjectedTools are tool names the client provided in the original request.

***

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:870](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#870)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:871](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#871)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:875](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#875)

ID is the unique response identifier

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:881](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#881)

ImageModel is set when an image generation tool was called during the request.
This allows the client to detect that the response contains generated images
and render them appropriately, even when the orchestrating model is a text model.

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#888)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:892](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#892)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:896](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#896)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:900](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#900)

Output is the array of output items (OpenAI Responses API format)

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:904](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#904)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:908](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#908)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:912](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#912)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:913](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#913)
