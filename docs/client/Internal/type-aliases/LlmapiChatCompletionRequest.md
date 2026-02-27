# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:730](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#730)

## Properties

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:735](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#735)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:739](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#739)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#743)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#747)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:748](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#748)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:752](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#752)

Tools is an array of tool schemas describing which tools the model can use
