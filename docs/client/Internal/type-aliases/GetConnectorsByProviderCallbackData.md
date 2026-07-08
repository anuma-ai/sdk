# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:9898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9898)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9899](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9899)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9900](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9900)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9906](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9906)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:9916](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9916)
