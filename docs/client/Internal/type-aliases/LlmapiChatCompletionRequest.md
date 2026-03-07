# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:956](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#956)

## Properties

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:961](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#961)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#965)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#969)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:973](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#973)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:974](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#974)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:978](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#978)

Tools is an array of tool schemas describing which tools the model can use
