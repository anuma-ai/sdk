# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:9537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9537)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9538)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9539](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9539)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9545)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:9555](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9555)
