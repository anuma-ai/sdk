# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:920](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L920)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:924](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L924)

Background indicates if request should be processed in background

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:925](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L925)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:929](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L929)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:933](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L933)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:934](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L934)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:938](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L938)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:942](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L942)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:943](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L943)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:944](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L944)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:948](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L948)

Tools is an array of tool schemas describing which tools the model can use
