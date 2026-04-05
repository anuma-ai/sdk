# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:1391](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1391)

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:1396](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1396)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1401](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1401)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1405](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1405)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1409)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1413](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1413)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:1414](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1414)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:1418](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1418)

Tools is an array of tool schemas describing which tools the model can use
