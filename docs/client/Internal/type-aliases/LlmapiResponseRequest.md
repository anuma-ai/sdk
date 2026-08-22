# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:880](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#880)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:884](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#884)

Background indicates if request should be processed in background

***

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#889)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:894](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#894)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:895](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#895)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:899](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#899)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:903](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#903)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:904](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#904)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:908](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#908)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:912](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#912)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:913](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#913)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:914](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#914)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:918](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#918)

Tools is an array of tool schemas describing which tools the model can use
