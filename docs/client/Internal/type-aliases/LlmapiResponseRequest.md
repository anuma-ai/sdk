# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1007](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1007)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1011](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1011)

Background indicates if request should be processed in background

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1012](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1012)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1016](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1016)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1020](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1020)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1021](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1021)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1025](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1025)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:1029](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1029)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:1030](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1030)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:1031](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1031)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:1035](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1035)

Tools is an array of tool schemas describing which tools the model can use
