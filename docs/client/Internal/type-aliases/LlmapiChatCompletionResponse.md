# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `object`

Defined in: src/client/types.gen.ts:171

## Properties

### choices?

> `optional` **choices**: [`LlmapiChoice`](LlmapiChoice.md)\[]

Defined in: src/client/types.gen.ts:175

Choices contains the completion choices

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: src/client/types.gen.ts:176

***

### id?

> `optional` **id**: `string`

Defined in: src/client/types.gen.ts:180

ID is the completion ID

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: src/client/types.gen.ts:187

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: src/client/types.gen.ts:191

Model is the model used

***

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)

Defined in: src/client/types.gen.ts:192
