# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:11697](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11697)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11698](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11698)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11699](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11699)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11705](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11705)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:11715](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11715)
