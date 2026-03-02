# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:1127](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1127)

## Properties

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1131](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1131)

ClientInjectedTools are tool names the client provided in the original request.

***

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:1135](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1135)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:1136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1136)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1140](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1140)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1147](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1147)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1151](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1151)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:1155](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1155)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:1159](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1159)

Output is the array of output items (OpenAI Responses API format)

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1163](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1163)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:1167](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1167)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:1171](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1171)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:1172](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1172)
