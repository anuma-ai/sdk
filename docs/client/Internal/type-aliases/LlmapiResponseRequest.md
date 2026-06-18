# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:844](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#844)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:848](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#848)

Background indicates if request should be processed in background

***

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:853](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#853)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:858](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#858)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#859)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:863](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#863)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:867](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#867)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:868](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#868)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:872](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#872)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:876](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#876)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:877](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#877)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#878)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:882](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#882)

Tools is an array of tool schemas describing which tools the model can use
