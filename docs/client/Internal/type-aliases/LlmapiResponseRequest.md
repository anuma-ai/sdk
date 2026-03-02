# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1091](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1091)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1095](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1095)

Background indicates if request should be processed in background

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1100](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1100)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1101](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1101)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1105)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1109](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1109)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1110](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1110)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1114](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1114)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1118](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1118)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1119)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1120)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1124](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1124)

Tools is an array of tool schemas describing which tools the model can use
