# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:1757](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1757)

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:1762](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1762)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1767](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1767)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1771](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1771)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1775](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1775)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1779](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1779)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:1780](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1780)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:1784](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1784)

Tools is an array of tool schemas describing which tools the model can use
