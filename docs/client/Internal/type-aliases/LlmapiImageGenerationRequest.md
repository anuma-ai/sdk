# LlmapiImageGenerationRequest

> **LlmapiImageGenerationRequest** = `object`

Defined in: src/client/types.gen.ts:353

## Properties

### model

> **model**: `string`

Defined in: src/client/types.gen.ts:357

Model is the model identifier to use for generation (e.g., "gpt-image-1").

***

### prompt

> **prompt**: `string`

Defined in: src/client/types.gen.ts:361

Prompt is the text description of the desired image.

***

### quality?

> `optional` **quality**: `string`

Defined in: src/client/types.gen.ts:365

Quality targets a quality preset (e.g., "auto", "high").

***

### response\_format?

> `optional` **response\_format**: `string`

Defined in: src/client/types.gen.ts:369

ResponseFormat controls how the generated image is returned (e.g., "url" or "b64\_json").

***

### size?

> `optional` **size**: `string`

Defined in: src/client/types.gen.ts:373

Size controls the dimensions of the generated image (e.g., "1024x1024").
