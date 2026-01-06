# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:145](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L145)

## Properties

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)[]

Defined in: [src/client/types.gen.ts:149](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L149)

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:153](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L153)

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:157](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L157)

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: `unknown`

Defined in: [src/client/types.gen.ts:164](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L164)

ToolChoice controls which tool to use. Can be:
- string: "auto", "none", "required", or a function name
- object: {"type": "function", "function": {"name": "my_function"}}
Using 'any' to match OpenAI's flexible API format.

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)[]

Defined in: [src/client/types.gen.ts:168](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L168)

Tools is an array of tool definitions the model can use
