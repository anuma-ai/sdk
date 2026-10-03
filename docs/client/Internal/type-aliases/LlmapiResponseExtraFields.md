# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#849)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:853](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#853)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:857](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#857)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:861](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#861)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:865](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#865)

RequestType is always "responses"
