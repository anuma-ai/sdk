# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:886](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#886)

## Properties

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:890](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#890)

ClientInjectedTools are tool names the client provided in the original request.

***

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:894](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#894)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:895](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#895)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:899](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#899)

ID is the unique response identifier

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:905](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#905)

ImageModel is set when an image generation tool was called during the request.
This allows the client to detect that the response contains generated images
and render them appropriately, even when the orchestrating model is a text model.

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:912](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#912)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:916](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#916)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:920](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#920)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:924](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#924)

Output is the array of output items (OpenAI Responses API format)

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:928](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#928)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:932](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#932)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#936)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:937](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#937)
