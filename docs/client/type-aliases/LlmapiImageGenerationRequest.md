# LlmapiImageGenerationRequest

> **LlmapiImageGenerationRequest** = `object`

Defined in: [src/client/types.gen.ts:270](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L270)

## Properties

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:274](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L274)

Model is the model identifier to use for generation (e.g., "gpt-image-1").

***

### prompt

> **prompt**: `string`

Defined in: [src/client/types.gen.ts:278](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L278)

Prompt is the text description of the desired image.

***

### quality?

> `optional` **quality**: `string`

Defined in: [src/client/types.gen.ts:282](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L282)

Quality targets a quality preset (e.g., "auto", "high").

***

### response\_format?

> `optional` **response\_format**: `string`

Defined in: [src/client/types.gen.ts:286](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L286)

ResponseFormat controls how the generated image is returned (e.g., "url" or "b64_json").

***

### size?

> `optional` **size**: `string`

Defined in: [src/client/types.gen.ts:290](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L290)

Size controls the dimensions of the generated image (e.g., "1024x1024").
