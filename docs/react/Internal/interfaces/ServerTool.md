# ServerTool

Defined in: [src/lib/tools/serverTools.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L63)

Server tool definition with parameters field.
This is the neutral format stored in cache.
Strategies transform this to the correct API format.

## Properties

### description

> **description**: `string`

Defined in: [src/lib/tools/serverTools.ts:66](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L66)

***

### embedding?

> `optional` **embedding**: `number`\[]

Defined in: [src/lib/tools/serverTools.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L73)

Optional embedding vector for semantic matching

***

### name

> **name**: `string`

Defined in: [src/lib/tools/serverTools.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L65)

***

### parameters

> **parameters**: `object`

Defined in: [src/lib/tools/serverTools.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L67)

**properties**

> **properties**: `Record`<`string`, `unknown`>

**required**

> **required**: `string`\[]

**type**

> **type**: `string`

***

### type

> **type**: `"function"`

Defined in: [src/lib/tools/serverTools.ts:64](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L64)
