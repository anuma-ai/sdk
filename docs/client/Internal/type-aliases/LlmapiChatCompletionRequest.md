# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:481](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#481)

## Properties

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:486](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#486)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:490](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#490)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:494](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#494)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:498](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#498)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:499](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#499)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:503](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#503)

Tools is an array of tool schemas describing which tools the model can use
