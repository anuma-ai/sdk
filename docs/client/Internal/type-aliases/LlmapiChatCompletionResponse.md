# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:412](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L412)

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: [src/client/types.gen.ts:416](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L416)

Choices contains the completion choices

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:417](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L417)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:421](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L421)

ID is the completion ID

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:428](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L428)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:432](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L432)

Model is the model used

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:436](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L436)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:440](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L440)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: [src/client/types.gen.ts:441](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L441)
