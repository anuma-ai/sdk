# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1403](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1403)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1407](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1407)

Background indicates if request should be processed in background

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1412](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1412)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1413](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1413)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1417](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1417)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1421](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1421)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1422](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1422)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1426)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1430](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1430)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1431](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1431)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1432](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1432)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1436](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1436)

Tools is an array of tool schemas describing which tools the model can use
