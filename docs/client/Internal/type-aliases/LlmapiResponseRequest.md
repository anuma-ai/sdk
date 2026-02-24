# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1042](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1042)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1046](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1046)

Background indicates if request should be processed in background

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1051](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1051)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1052](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1052)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1056](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1056)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1060](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1060)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1061](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1061)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1065](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1065)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1069](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1069)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1070](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1070)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1071](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1071)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1075](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1075)

Tools is an array of tool schemas describing which tools the model can use
