# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:686](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L686)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:690](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L690)

Background indicates if request should be processed in background

***

### conversation?

> `optional` **conversation**: `string`

Defined in: [src/client/types.gen.ts:694](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L694)

Conversation is the conversation ID (optional)

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:695](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L695)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:699](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L699)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:703](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L703)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:704](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L704)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:708](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L708)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:712](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L712)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:713](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L713)

***

### tool\_choice?

> `optional` **tool\_choice**: `string`

Defined in: [src/client/types.gen.ts:717](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L717)

ToolChoice controls which tool to use (auto, any, none, required, or tool name)

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)[]

Defined in: [src/client/types.gen.ts:721](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L721)

Tools is an array of tool definitions the model can use
