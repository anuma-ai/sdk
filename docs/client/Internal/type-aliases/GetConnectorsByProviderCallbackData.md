# GetConnectorsByProviderCallbackData

> **GetConnectorsByProviderCallbackData** = `object`

Defined in: [src/client/types.gen.ts:9560](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9560)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9561)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9562)

**provider**

> **provider**: `string`

Logical connector provider

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9568](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9568)

**code**

> **code**: `string`

Authorization code from upstream

**state**

> **state**: `string`

ticket\_id:csrf\_state encoded value

***

### url

> **url**: `"/connectors/{provider}/callback"`

Defined in: [src/client/types.gen.ts:9578](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9578)
