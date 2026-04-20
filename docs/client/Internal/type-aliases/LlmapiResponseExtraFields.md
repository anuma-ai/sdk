# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1821](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1821)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1825](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1825)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1829](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1829)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1833](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1833)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1837](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1837)

RequestType is always "responses"
