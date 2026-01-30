# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:755](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L755)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:759](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L759)

Background indicates if request should be processed in background

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:760](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L760)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:764](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L764)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:768](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L768)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:769](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L769)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:773](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L773)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:777](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L777)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:778](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L778)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:779](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L779)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:783](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L783)

Tools is an array of tool schemas describing which tools the model can use
