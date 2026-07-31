# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:10635](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10635)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10636](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10636)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10637](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10637)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10643](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10643)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:10653](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10653)
