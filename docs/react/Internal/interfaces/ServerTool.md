# ServerTool

Defined in: [src/lib/tools/serverTools.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L71)

Server tool definition with parameters field.
This is the neutral format stored in cache.
Strategies transform this to the correct API format.

## Properties

### description

> **description**: `string`

Defined in: [src/lib/tools/serverTools.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L74)

***

### embedding?

> `optional` **embedding**: `number`\[]

Defined in: [src/lib/tools/serverTools.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L81)

Optional embedding vector for semantic matching

***

### name

> **name**: `string`

Defined in: [src/lib/tools/serverTools.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L73)

***

### parameters

> **parameters**: `object`

Defined in: [src/lib/tools/serverTools.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L75)

**properties**

> **properties**: `Record`<`string`, `unknown`>

**required**

> **required**: `string`\[]

**type**

> **type**: `string`

***

### type

> **type**: `"function"`

Defined in: [src/lib/tools/serverTools.ts:72](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L72)
