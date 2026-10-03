# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:963](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#963)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:967](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#967)

Background indicates if request should be processed in background

***

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:972](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#972)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:977](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#977)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:978](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#978)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:982](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#982)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:986](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#986)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:987](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#987)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:991](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#991)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:995](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#995)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:996](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#996)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:997](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#997)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1001](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1001)

Tools is an array of tool schemas describing which tools the model can use
