# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:11346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11346)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11347)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11348](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11348)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11354](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11354)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:11364](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11364)
