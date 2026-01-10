# LlmapiChatCompletionRequest

> **LlmapiChatCompletionRequest** = `object`

Defined in: src/client/types.gen.ts:145

## Properties

### messages

> **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: src/client/types.gen.ts:149

Messages is the conversation history

***

### model

> **model**: `string`

Defined in: src/client/types.gen.ts:153

Model is the model identifier

***

### stream?

> `optional` **stream**: `boolean`

Defined in: src/client/types.gen.ts:157

Stream indicates if response should be streamed

***

### tool\_choice?

> `optional` **tool\_choice**: `unknown`

Defined in: src/client/types.gen.ts:164

ToolChoice controls which tool to use. Can be:

* string: "auto", "none", "required", or a function name
* object: {"type": "function", "function": {"name": "my\_function"}}
  Using 'any' to match OpenAI's flexible API format.

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)\[]

Defined in: src/client/types.gen.ts:168

Tools is an array of tool definitions the model can use
