# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:10385](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10385)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10386](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10386)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10387](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10387)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10393](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10393)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:10403](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10403)
