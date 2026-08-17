# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:11499](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11499)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11500](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11500)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11501](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11501)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11507](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11507)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:11517](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11517)
