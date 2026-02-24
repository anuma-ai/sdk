# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:506](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L506)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:510](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L510)

Choices contains the completion choices

***

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:514](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L514)

ClientInjectedTools are tool names the client provided in the original request.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:515](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L515)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:519](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L519)

ID is the completion ID

***

### inference\_id?

> `optional` **inference\_id**: `string`

Defined in: [src/client/types.gen.ts:523](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L523)

InferenceID is the unique identifier for this inference request

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:530](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L530)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:534](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L534)

Model is the model used

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:538](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L538)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:542](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L542)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:546](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L546)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:547](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L547)
