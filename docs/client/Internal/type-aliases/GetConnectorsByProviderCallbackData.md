# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:10444](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10444)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10445)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10446](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10446)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10452](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10452)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:10462](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10462)
