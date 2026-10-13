# CachedServerTools

Defined in: [src/lib/tools/serverTools.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#77)

Cached tools structure stored in localStorage

## Properties

### checksum?

> `optional` **checksum**: `string`

Defined in: [src/lib/tools/serverTools.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#82)

Checksum from the server for cache invalidation

***

### etag?

> `optional` **etag**: `string`

Defined in: [src/lib/tools/serverTools.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#84)

ETag from the server. The next refresh sends it in an If-None-Match header.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/lib/tools/serverTools.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#79)

***

### tools

> **tools**: [`ServerTool`](ServerTool.md)\[]

Defined in: [src/lib/tools/serverTools.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#78)

***

### version

> **version**: `string`

Defined in: [src/lib/tools/serverTools.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#80)
