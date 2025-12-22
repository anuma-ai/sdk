# LlmapiImageGenerationRequest

> **LlmapiImageGenerationRequest** = `object`

Defined in: [src/client/types.gen.ts:297](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L297)

## Properties

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:301](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L301)

Model is the model identifier to use for generation (e.g., "gpt-image-1").

***

### prompt

> **prompt**: `string`

Defined in: [src/client/types.gen.ts:305](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L305)

Prompt is the text description of the desired image.

***

### quality?

> `optional` **quality**: `string`

Defined in: [src/client/types.gen.ts:309](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L309)

Quality targets a quality preset (e.g., "auto", "high").

***

### response\_format?

> `optional` **response\_format**: `string`

Defined in: [src/client/types.gen.ts:313](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L313)

ResponseFormat controls how the generated image is returned (e.g., "url" or "b64_json").

***

### size?

> `optional` **size**: `string`

Defined in: [src/client/types.gen.ts:317](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L317)

Size controls the dimensions of the generated image (e.g., "1024x1024").
