# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:9665](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9665)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9666](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9666)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9667](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9667)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9673](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9673)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:9683](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9683)
