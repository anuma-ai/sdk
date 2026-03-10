# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1441](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1441)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1445)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1449)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1453](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1453)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1457](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1457)

RequestType is always "responses"
