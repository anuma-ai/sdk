# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:876](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L876)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:880](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L880)

Background indicates if request should be processed in background

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:881](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L881)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:885](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L885)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:889](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L889)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:890](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L890)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:894](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L894)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:898](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L898)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:899](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L899)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:900](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L900)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:904](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L904)

Tools is an array of tool schemas describing which tools the model can use
