# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1347)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1351)

Background indicates if request should be processed in background

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1356](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1356)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1357](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1357)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1361](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1361)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1365](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1365)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1366](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1366)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1370](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1370)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1374](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1374)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1375](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1375)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1376](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1376)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1380)

Tools is an array of tool schemas describing which tools the model can use
