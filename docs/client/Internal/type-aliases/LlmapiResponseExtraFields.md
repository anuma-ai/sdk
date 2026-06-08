# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:713](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#713)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#717)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#721)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:725](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#725)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#729)

RequestType is always "responses"
