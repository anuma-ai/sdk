# LlmapiImageGenerationRequest

> **LlmapiImageGenerationRequest** = \{ `model`: `string`; `prompt`: `string`; `quality?`: `string`; `response_format?`: `string`; `size?`: `string`; \}

Defined in: [src/client/types.gen.ts:353](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L353)

## Properties

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:357](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L357)

Model is the model identifier to use for generation (e.g., "gpt-image-1").

***

### prompt

> **prompt**: `string`

Defined in: [src/client/types.gen.ts:361](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L361)

Prompt is the text description of the desired image.

***

### quality?

> `optional` **quality**: `string`

Defined in: [src/client/types.gen.ts:365](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L365)

Quality targets a quality preset (e.g., "auto", "high").

***

### response\_format?

> `optional` **response\_format**: `string`

Defined in: [src/client/types.gen.ts:369](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L369)

ResponseFormat controls how the generated image is returned (e.g., "url" or "b64_json").

***

### size?

> `optional` **size**: `string`

Defined in: [src/client/types.gen.ts:373](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L373)

Size controls the dimensions of the generated image (e.g., "1024x1024").
