# LlmapiPortalChatCompletionRequest

> **LlmapiPortalChatCompletionRequest** = `object`

Defined in: [src/client/types.gen.ts:646](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#646)

Portal carries non-OpenAI fields scoped to the portal under a single key so they don't
collide with the embedded SDK type's custom JSON marshaling.

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:651](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#651)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:656](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#656)

ImageModel is the user-selected image generation model.
When set, the portal overrides the model field in image tool call arguments.
