# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:12208](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12208)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:12209](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12209)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:12210](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12210)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:12216](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12216)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:12226](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#12226)
