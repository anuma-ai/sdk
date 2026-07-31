# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:11086](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11086)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11087](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11087)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11088)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11094)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:11104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11104)
