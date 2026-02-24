# ServerTool

Defined in: [src/lib/tools/serverTools.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#L64)

Server tool definition with parameters field.
This is the neutral format stored in cache.
Strategies transform this to the correct API format.

## Properties

### description

> **description**: `string`

Defined in: [src/lib/tools/serverTools.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#L67)

***

### embedding?

> `optional` **embedding**: `number`\[]

Defined in: [src/lib/tools/serverTools.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#L74)

Optional embedding vector for semantic matching

***

### name

> **name**: `string`

Defined in: [src/lib/tools/serverTools.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#L66)

***

### parameters

> **parameters**: `object`

Defined in: [src/lib/tools/serverTools.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#L68)

**properties**

> **properties**: `Record`<`string`, `unknown`>

**required**

> **required**: `string`\[]

**type**

> **type**: `string`

***

### type

> **type**: `"function"`

Defined in: [src/lib/tools/serverTools.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#L65)
