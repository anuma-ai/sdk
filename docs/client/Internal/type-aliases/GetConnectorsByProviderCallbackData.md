# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:10088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10088)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10089)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10090)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10096](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10096)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:10106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10106)
