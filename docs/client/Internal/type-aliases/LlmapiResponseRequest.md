# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:1969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1969)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:1973](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1973)

Background indicates if request should be processed in background

***

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:1978](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1978)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:1983](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1983)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:1984](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1984)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1988](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1988)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1992](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1992)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:1993](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1993)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:1997](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1997)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:2001](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2001)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:2002](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2002)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:2003](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2003)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:2007](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2007)

Tools is an array of tool schemas describing which tools the model can use
