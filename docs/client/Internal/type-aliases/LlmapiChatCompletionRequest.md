# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:1384](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1384)

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:1389](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1389)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1394](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1394)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1398)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1402](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1402)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1406](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1406)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:1407](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1407)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:1411](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1411)

Tools is an array of tool schemas describing which tools the model can use
