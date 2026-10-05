# CachedServerTools

Defined in: [src/lib/tools/serverTools.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#88)

Cached tools structure stored in localStorage

## Properties

### checksum?

> `optional` **checksum**: `string`

Defined in: [src/lib/tools/serverTools.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#93)

Checksum from the server for cache invalidation

***

### etag?

> `optional` **etag**: `string`

Defined in: [src/lib/tools/serverTools.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#95)

ETag from the server. The next refresh sends it in an If-None-Match header.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/lib/tools/serverTools.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#90)

***

### tools

> **tools**: [`ServerTool`](ServerTool.md)\[]

Defined in: [src/lib/tools/serverTools.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#89)

***

### version

> **version**: `string`

Defined in: [src/lib/tools/serverTools.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#91)
