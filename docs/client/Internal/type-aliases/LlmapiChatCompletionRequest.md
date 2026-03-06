# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#888)

## Properties

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:893](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#893)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:897](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#897)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:901](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#901)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:905](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#905)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:906](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#906)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:910](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#910)

Tools is an array of tool schemas describing which tools the model can use
