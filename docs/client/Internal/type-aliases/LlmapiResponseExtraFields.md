# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: src/client/types.gen.ts:626

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: src/client/types.gen.ts:630

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: src/client/types.gen.ts:634

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: src/client/types.gen.ts:638

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: src/client/types.gen.ts:642

RequestType is always "responses"
