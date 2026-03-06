# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1555](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1555)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1559](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1559)

Background indicates if request should be processed in background

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1564](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1564)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1565](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1565)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1569](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1569)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1573](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1573)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1574](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1574)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1578](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1578)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1582](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1582)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1583](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1583)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1584](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1584)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1588](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1588)

Tools is an array of tool schemas describing which tools the model can use
