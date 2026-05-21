# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:1787](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1787)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:1791](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1791)

Choices contains the completion choices

***

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1795](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1795)

ClientInjectedTools are tool names the client provided in the original request.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:1796](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1796)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1800](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1800)

ID is the completion ID

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1806](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1806)

ImageModel is set when an image generation tool was called during the request.
This allows the client to detect that the response contains generated images
and render them appropriately, even when the orchestrating model is a text model.

***

### inference\_id?

> `optional` **inference\_id**: `string`

Defined in: [src/client/types.gen.ts:1810](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1810)

InferenceID is the unique identifier for this inference request

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1817](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1817)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1821](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1821)

Model is the model used

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1825](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1825)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:1829](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1829)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:1833](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1833)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:1834](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1834)
