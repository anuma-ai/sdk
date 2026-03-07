# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:981](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#981)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:985](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#985)

Choices contains the completion choices

***

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:989](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#989)

ClientInjectedTools are tool names the client provided in the original request.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:990](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#990)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:994](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#994)

ID is the completion ID

***

### inference\_id?

> `optional` **inference\_id**: `string`

Defined in: [src/client/types.gen.ts:998](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#998)

InferenceID is the unique identifier for this inference request

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1005](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1005)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1009](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1009)

Model is the model used

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1013](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1013)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:1017](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1017)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:1021](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1021)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:1022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1022)
