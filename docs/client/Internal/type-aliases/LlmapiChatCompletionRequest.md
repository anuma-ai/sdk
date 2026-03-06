# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:994](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#994)

## Properties

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:999](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#999)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1003](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1003)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1007](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1007)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1011](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1011)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:1012](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1012)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:1016](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1016)

Tools is an array of tool schemas describing which tools the model can use
