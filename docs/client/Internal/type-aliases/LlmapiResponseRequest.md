# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1291](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1291)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1295](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1295)

Background indicates if request should be processed in background

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1300)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1301](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1301)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1305](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1305)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1309)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1310](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1310)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1314](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1314)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1318](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1318)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1319)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1320](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1320)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1324](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1324)

Tools is an array of tool schemas describing which tools the model can use
