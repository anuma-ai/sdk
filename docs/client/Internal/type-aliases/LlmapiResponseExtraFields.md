# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1403](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1403)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1407](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1407)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1411](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1411)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1415](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1415)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1419](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1419)

RequestType is always "responses"
