# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:9192](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9192)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9193](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9193)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9194](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9194)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9200](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9200)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:9210](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9210)
