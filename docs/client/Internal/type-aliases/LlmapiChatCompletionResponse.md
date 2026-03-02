# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:811](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#811)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:815](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#815)

Choices contains the completion choices

***

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:819](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#819)

ClientInjectedTools are tool names the client provided in the original request.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:820](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#820)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:824](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#824)

ID is the completion ID

***

### inference\_id?

> `optional` **inference\_id**: `string`

Defined in: [src/client/types.gen.ts:828](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#828)

InferenceID is the unique identifier for this inference request

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:835](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#835)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:839](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#839)

Model is the model used

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:843](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#843)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:847](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#847)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:851](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#851)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:852](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#852)
