# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:11097](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11097)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11098)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11099](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11099)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11105)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:11115](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11115)
