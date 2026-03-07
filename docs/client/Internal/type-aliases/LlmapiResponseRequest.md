# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1517](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1517)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1521)

Background indicates if request should be processed in background

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1526)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1527](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1527)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1531](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1531)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1535](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1535)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1536](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1536)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1540](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1540)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1544](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1544)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1545)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1546](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1546)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1550](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1550)

Tools is an array of tool schemas describing which tools the model can use
