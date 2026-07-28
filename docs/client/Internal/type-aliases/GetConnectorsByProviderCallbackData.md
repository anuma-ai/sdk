# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:10540](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10540)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10541](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10541)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10542](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10542)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10548](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10548)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:10558](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10558)
