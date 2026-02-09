# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:983](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L983)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:987](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L987)

Background indicates if request should be processed in background

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:988](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L988)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:992](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L992)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:996](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L996)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:997](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L997)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1001](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1001)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1005](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1005)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1006](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1006)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1007](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1007)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1011](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1011)

Tools is an array of tool schemas describing which tools the model can use
