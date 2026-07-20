# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:10380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10380)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10381](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10381)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10382)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10388)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:10398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10398)
