# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1289](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1289)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1293](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1293)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1297](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1297)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1301](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1301)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1305](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1305)

RequestType is always "responses"
