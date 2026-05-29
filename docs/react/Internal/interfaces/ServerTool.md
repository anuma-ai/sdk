# ServerTool

Defined in: [src/lib/tools/serverTools.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#66)

Server tool definition with parameters field.
This is the neutral format stored in cache.
Strategies transform this to the correct API format.

## Properties

### description

> **description**: `string`

Defined in: [src/lib/tools/serverTools.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#69)

***

### embedding?

> `optional` **embedding**: `number`\[]

Defined in: [src/lib/tools/serverTools.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#76)

Optional embedding vector for semantic matching

***

### name

> **name**: `string`

Defined in: [src/lib/tools/serverTools.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#68)

***

### parameters

> **parameters**: `object`

Defined in: [src/lib/tools/serverTools.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#70)

**properties**

> **properties**: `Record`<`string`, `unknown`>

**required**

> **required**: `string`\[]

**type**

> **type**: `string`

***

### type

> **type**: `"function"`

Defined in: [src/lib/tools/serverTools.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#67)
