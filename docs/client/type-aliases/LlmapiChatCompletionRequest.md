# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:107](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L107)

## Properties

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)[]

Defined in: [src/client/types.gen.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L111)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L115)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:119](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L119)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: `unknown`

Defined in: [src/client/types.gen.ts:126](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L126)

ToolChoice controls which tool to use. Can be:
- string: "auto", "none", "required", or a function name
- object: {"type": "function", "function": {"name": "my_function"}}
Using 'any' to match OpenAI's flexible API format.

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)[]

Defined in: [src/client/types.gen.ts:130](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L130)

Tools is an array of tool definitions the model can use
