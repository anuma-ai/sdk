# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:9886](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9886)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9887](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9887)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9888)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9894](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9894)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:9904](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9904)
