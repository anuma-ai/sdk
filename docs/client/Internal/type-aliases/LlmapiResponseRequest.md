# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1449)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1453](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1453)

Background indicates if request should be processed in background

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1458](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1458)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1459](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1459)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1463](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1463)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1467](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1467)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1468)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1472)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1476](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1476)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1477)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1478](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1478)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1482](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1482)

Tools is an array of tool schemas describing which tools the model can use
