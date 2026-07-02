# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:850](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#850)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:854](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#854)

Background indicates if request should be processed in background

***

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#859)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:864](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#864)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:865](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#865)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:869](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#869)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:873](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#873)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:874](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#874)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#878)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:882](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#882)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:883](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#883)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:884](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#884)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#888)

Tools is an array of tool schemas describing which tools the model can use
