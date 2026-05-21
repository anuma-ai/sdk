# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:2360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2360)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:2364](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2364)

Background indicates if request should be processed in background

***

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:2369](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2369)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:2374](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2374)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:2375](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2375)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2379](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2379)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:2383](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2383)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:2384](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2384)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:2388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2388)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:2392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2392)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:2393](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2393)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:2394](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2394)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:2398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2398)

Tools is an array of tool schemas describing which tools the model can use
