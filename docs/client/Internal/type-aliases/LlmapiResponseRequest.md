# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1976](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1976)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1980](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1980)

Background indicates if request should be processed in background

***

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:1985](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1985)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1990](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1990)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1991](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1991)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1995](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1995)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1999](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1999)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:2000](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2000)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:2004](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2004)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:2008](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2008)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:2009](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2009)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:2010](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2010)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:2014](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2014)

Tools is an array of tool schemas describing which tools the model can use
