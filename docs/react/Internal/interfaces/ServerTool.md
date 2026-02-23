# ServerTool

Defined in: [src/lib/tools/serverTools.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L61)

Server tool definition with parameters field.
This is the neutral format stored in cache.
Strategies transform this to the correct API format.

## Properties

### description

> **description**: `string`

Defined in: [src/lib/tools/serverTools.ts:64](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L64)

***

### embedding?

> `optional` **embedding**: `number`\[]

Defined in: [src/lib/tools/serverTools.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L71)

Optional embedding vector for semantic matching

***

### name

> **name**: `string`

Defined in: [src/lib/tools/serverTools.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L63)

***

### parameters

> **parameters**: `object`

Defined in: [src/lib/tools/serverTools.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L65)

**properties**

> **properties**: `Record`<`string`, `unknown`>

**required**

> **required**: `string`\[]

**type**

> **type**: `string`

***

### type

> **type**: `"function"`

Defined in: [src/lib/tools/serverTools.ts:62](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L62)
