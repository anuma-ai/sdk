# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:731](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#731)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:735](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#735)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:739](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#739)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#743)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#747)

RequestType is always "responses"
