# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:786](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#786)

## Properties

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:791](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#791)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:795](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#795)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:799](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#799)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:803](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#803)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:804](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#804)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:808](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#808)

Tools is an array of tool schemas describing which tools the model can use
