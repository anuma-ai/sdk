# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:622](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L622)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:626](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L626)

Background indicates if request should be processed in background

***

### conversation?

> `optional` **conversation**: `string`

Defined in: [src/client/types.gen.ts:630](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L630)

Conversation is the conversation ID (optional)

***

### input

> **input**: `string`

Defined in: [src/client/types.gen.ts:634](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L634)

Input is the simple text input for the response

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:638](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L638)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:642](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L642)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:643](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L643)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:647](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L647)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:651](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L651)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:652](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L652)

***

### tool\_choice?

> `optional` **tool\_choice**: `string`

Defined in: [src/client/types.gen.ts:656](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L656)

ToolChoice controls which tool to use (auto, any, none, required, or tool name)

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)[]

Defined in: [src/client/types.gen.ts:660](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L660)

Tools is an array of tool definitions (passed through, no MCP loop)
