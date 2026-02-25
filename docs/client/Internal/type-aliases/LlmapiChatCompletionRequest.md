# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:530](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#530)

## Properties

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:535](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#535)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:539](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#539)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:543](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#543)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:547](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#547)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:548](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#548)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:552](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#552)

Tools is an array of tool schemas describing which tools the model can use
