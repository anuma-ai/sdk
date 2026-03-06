# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:913](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#913)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:917](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#917)

Choices contains the completion choices

***

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:921](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#921)

ClientInjectedTools are tool names the client provided in the original request.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:922](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#922)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:926](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#926)

ID is the completion ID

***

### inference\_id?

> `optional` **inference\_id**: `string`

Defined in: [src/client/types.gen.ts:930](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#930)

InferenceID is the unique identifier for this inference request

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:937](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#937)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:941](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#941)

Model is the model used

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#945)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:949](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#949)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:953](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#953)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:954](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#954)
