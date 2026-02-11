# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:991](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L991)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:995](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L995)

Background indicates if request should be processed in background

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:996](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L996)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1000](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1000)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1004](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1004)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1005](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1005)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1009](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1009)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1013](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1013)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1014](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1014)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1015](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1015)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1019](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1019)

Tools is an array of tool schemas describing which tools the model can use
