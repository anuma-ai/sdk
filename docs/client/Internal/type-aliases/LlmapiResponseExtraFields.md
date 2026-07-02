# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:736](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#736)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:740](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#740)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:744](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#744)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:748](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#748)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:752](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#752)

RequestType is always "responses"
