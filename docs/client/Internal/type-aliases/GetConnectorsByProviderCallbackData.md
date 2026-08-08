# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:11267](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11267)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11268](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11268)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11269](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11269)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11275](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11275)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:11285](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11285)
