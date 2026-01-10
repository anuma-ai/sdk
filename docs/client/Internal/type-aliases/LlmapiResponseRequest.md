# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: src/client/types.gen.ts:724

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: src/client/types.gen.ts:728

Background indicates if request should be processed in background

***

### conversation?

> `optional` **conversation**: `string`

Defined in: src/client/types.gen.ts:732

Conversation is the conversation ID (optional)

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: src/client/types.gen.ts:733

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: src/client/types.gen.ts:737

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: src/client/types.gen.ts:741

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: src/client/types.gen.ts:742

***

### stream?

> `optional` **stream**: `boolean`

Defined in: src/client/types.gen.ts:746

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: src/client/types.gen.ts:750

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: src/client/types.gen.ts:751

***

### tool\_choice?

> `optional` **tool\_choice**: `string`

Defined in: src/client/types.gen.ts:755

ToolChoice controls which tool to use (auto, any, none, required, or tool name)

***

### tools?

> `optional` **tools**: [`LlmapiTool`](LlmapiTool.md)\[]

Defined in: src/client/types.gen.ts:759

Tools is an array of tool definitions the model can use
