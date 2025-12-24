# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:604](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L604)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:608](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L608)

Background indicates if request should be processed in background

***

### conversation?

> `optional` **conversation**: `string`

Defined in: [src/client/types.gen.ts:612](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L612)

Conversation is the conversation ID (optional)

***

### input

> **input**: `string`

Defined in: [src/client/types.gen.ts:616](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L616)

Input is the simple text input for the response

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:620](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L620)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:624](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L624)

Model is the model identifier in 'provider/model' format

***

### previous\_response\_id?

> `optional` **previous\_response\_id**: `string`

Defined in: [src/client/types.gen.ts:628](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L628)

PreviousResponseID is the ID of a previous response to continue from

***

### store?

> `optional` **store**: `boolean`

Defined in: [src/client/types.gen.ts:632](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L632)

Store indicates if the response should be stored

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:636](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L636)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:640](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L640)

Temperature controls randomness (0.0 to 2.0)

***

### tool\_choice?

> `optional` **tool\_choice**: `string`

Defined in: [src/client/types.gen.ts:644](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L644)

ToolChoice controls which tool to use (auto, any, none, required, or tool name)

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)[]

Defined in: [src/client/types.gen.ts:648](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L648)

Tools is an array of tool definitions (passed through, no MCP loop)
