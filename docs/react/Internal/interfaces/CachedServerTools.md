# CachedServerTools

Defined in: [src/lib/tools/serverTools.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#76)

Cached server tools for the active cache backend.

## Properties

### checksum?

> `optional` **checksum**: `string`

Defined in: [src/lib/tools/serverTools.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#81)

Checksum from the server for cache invalidation

***

### etag?

> `optional` **etag**: `string`

Defined in: [src/lib/tools/serverTools.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#83)

ETag from the server. The next refresh sends it in an If-None-Match header.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/lib/tools/serverTools.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#78)

***

### tools

> **tools**: [`ServerTool`](ServerTool.md)\[]

Defined in: [src/lib/tools/serverTools.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#77)

***

### version

> **version**: `string`

Defined in: [src/lib/tools/serverTools.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#79)
