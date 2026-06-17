# LlmapiResponseRequest

> **LlmapiResponseRequest** = `object`

Defined in: [src/client/types.gen.ts:821](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#821)

## Properties

### background?

> `optional` **background**: `boolean`

Defined in: [src/client/types.gen.ts:825](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#825)

Background indicates if request should be processed in background

***

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:830](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#830)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:835](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#835)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.

***

### input

> **input**: [`LlmapiResponseInput`](LlmapiResponseInput.md)

Defined in: [src/client/types.gen.ts:836](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#836)

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:840](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#840)

MaxOutputTokens is the maximum number of tokens to generate

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:844](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#844)

Model is the model identifier in 'provider/model' format

***

### reasoning?

> `optional` **reasoning**: [`LlmapiResponseReasoning`](LlmapiResponseReasoning.md)

Defined in: [src/client/types.gen.ts:845](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#845)

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/client/types.gen.ts:849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#849)

Stream indicates if response should be streamed

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [src/client/types.gen.ts:853](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#853)

Temperature controls randomness (0.0 to 2.0)

***

### thinking?

> `optional` **thinking**: [`LlmapiThinkingOptions`](LlmapiThinkingOptions.md)

Defined in: [src/client/types.gen.ts:854](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#854)

***

### tool\_choice?

> `optional` **tool\_choice**: [`LlmapiResponseToolChoice`](LlmapiResponseToolChoice.md)

Defined in: [src/client/types.gen.ts:855](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#855)

***

### tools?

> `optional` **tools**: [`LlmapiResponseTool`](LlmapiResponseTool.md)\[]

Defined in: [src/client/types.gen.ts:859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#859)

Tools is an array of tool schemas describing which tools the model can use
