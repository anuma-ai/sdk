# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:9874](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9874)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9875](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9875)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9876](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9876)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9882](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9882)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:9892](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9892)
