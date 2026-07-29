# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:10647](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10647)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10648](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10648)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10649](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10649)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10655](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10655)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:10665](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10665)
