# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:9650](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9650)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9651](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9651)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9652](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9652)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9658](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9658)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:9668](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9668)
