# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:10538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10538)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10539](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10539)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10540](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10540)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10546](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10546)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:10556](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10556)
