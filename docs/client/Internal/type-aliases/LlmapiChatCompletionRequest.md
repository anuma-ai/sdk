# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:842](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#842)

## Properties

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:847](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#847)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:851](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#851)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:855](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#855)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#859)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiChatCompletionToolChoice`](LlmapiChatCompletionToolChoice.md)

Defined in: [src/client/types.gen.ts:860](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#860)

***

### tools?

> `optional` **tools**: [`LlmapiChatCompletionTool`](LlmapiChatCompletionTool.md)\[]

Defined in: [src/client/types.gen.ts:864](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#864)

Tools is an array of tool schemas describing which tools the model can use
