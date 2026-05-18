# HandlersGuestChatResponse

> **HandlersGuestChatResponse** = `object`

Defined in: [src/client/types.gen.ts:819](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#819)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:823](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#823)

Choices contains the completion choices

***

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:827](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#827)

ClientInjectedTools are tool names the client provided in the original request.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:828](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#828)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:832](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#832)

ID is the completion ID

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:838](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#838)

ImageModel is set when an image generation tool was called during the request.
This allows the client to detect that the response contains generated images
and render them appropriately, even when the orchestrating model is a text model.

***

### inference\_id?

> `optional` **inference\_id**: `string`

Defined in: [src/client/types.gen.ts:842](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#842)

InferenceID is the unique identifier for this inference request

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#849)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### messages\_remaining?

> `optional` **messages\_remaining**: `number`

Defined in: [src/client/types.gen.ts:850](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#850)

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:854](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#854)

Model is the model used

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:858](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#858)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:862](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#862)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:866](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#866)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:867](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#867)
