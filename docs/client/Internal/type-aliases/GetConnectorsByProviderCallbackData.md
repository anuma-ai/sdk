# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:10321](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10321)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10322](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10322)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10323](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10323)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10329](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10329)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:10339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10339)
