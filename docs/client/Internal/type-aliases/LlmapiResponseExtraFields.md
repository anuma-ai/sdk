# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:977](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#977)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:981](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#981)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:985](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#985)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:989](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#989)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:993](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#993)

RequestType is always "responses"
