# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:632](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L632)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:636](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L636)

Background indicates if request should be processed in background

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:637](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L637)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:641](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L641)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:645](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L645)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:646](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L646)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:650](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L650)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:654](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L654)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:655](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L655)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiToolChoice`](LlmapiToolChoice.md)

Defined in: [src/client/types.gen.ts:656](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L656)

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)\[]

Defined in: [src/client/types.gen.ts:660](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L660)

Tools is an array of tool definitions the model can use
