# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:1350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1350)

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:1355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1355)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1360)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1364](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1364)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1368](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1368)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1372)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:1373](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1373)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:1377](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1377)

Tools is an array of tool schemas describing which tools the model can use
