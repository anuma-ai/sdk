# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:707](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#707)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#711)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:715](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#715)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:719](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#719)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:723](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#723)

RequestType is always "responses"
