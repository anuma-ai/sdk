# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1935](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1935)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1939](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1939)

Background indicates if request should be processed in background

***

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:1944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1944)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1949](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1949)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1950](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1950)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1954](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1954)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1958)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1959](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1959)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1963](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1963)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1967](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1967)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1968](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1968)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1969)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1973](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1973)

Tools is an array of tool schemas describing which tools the model can use
