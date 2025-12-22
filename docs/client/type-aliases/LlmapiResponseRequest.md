# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:577](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L577)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:581](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L581)

Background indicates if request should be processed in background

***

### conversation?

> `optional` **conversation**: `string`

Defined in: [src/client/types.gen.ts:585](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L585)

Conversation is the conversation ID (optional)

***

### input

> **input**: `string`

Defined in: [src/client/types.gen.ts:589](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L589)

Input is the simple text input for the response

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:593](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L593)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:597](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L597)

Model is the model identifier in 'provider/model' format

***

### previous\_response\_id?

> `optional` **previous\_response\_id**: `string`

Defined in: [src/client/types.gen.ts:601](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L601)

PreviousResponseID is the ID of a previous response to continue from

***

### store?

> `optional` **store**: `boolean`

Defined in: [src/client/types.gen.ts:605](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L605)

Store indicates if the response should be stored

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:609](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L609)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:613](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L613)

Temperature controls randomness (0.0 to 2.0)

***

### tool\_choice?

> `optional` **tool\_choice**: `string`

Defined in: [src/client/types.gen.ts:617](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L617)

ToolChoice controls which tool to use (auto, any, none, required, or tool name)

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)[]

Defined in: [src/client/types.gen.ts:621](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L621)

Tools is an array of tool definitions (passed through, no MCP loop)
