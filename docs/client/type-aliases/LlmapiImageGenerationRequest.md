# LlmapiImageGenerationRequest

> **LlmapiImageGenerationRequest** = `object`

Defined in: [src/client/types.gen.ts:315](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L315)

## Properties

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:319](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L319)

Model is the model identifier to use for generation (e.g., "gpt-image-1").

***

### prompt

> **prompt**: `string`

Defined in: [src/client/types.gen.ts:323](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L323)

Prompt is the text description of the desired image.

***

### quality?

> `optional` **quality**: `string`

Defined in: [src/client/types.gen.ts:327](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L327)

Quality targets a quality preset (e.g., "auto", "high").

***

### response\_format?

> `optional` **response\_format**: `string`

Defined in: [src/client/types.gen.ts:331](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L331)

ResponseFormat controls how the generated image is returned (e.g., "url" or "b64_json").

***

### size?

> `optional` **size**: `string`

Defined in: [src/client/types.gen.ts:335](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L335)

Size controls the dimensions of the generated image (e.g., "1024x1024").
