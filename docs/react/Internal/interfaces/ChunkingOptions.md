# ChunkingOptions

Defined in: [src/lib/memoryEngine/chunking.ts:8](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/chunking.ts#8)

Text Chunking Utilities

Splits text into overlapping chunks for better semantic search.
Uses sentence boundaries when possible to preserve meaning.

## Properties

### chunkOverlap?

> `optional` **chunkOverlap**: `number`

Defined in: [src/lib/memoryEngine/chunking.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/chunking.ts#12)

Overlap between chunks in characters (default: 50)

***

### chunkSize?

> `optional` **chunkSize**: `number`

Defined in: [src/lib/memoryEngine/chunking.ts:10](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/chunking.ts#10)

Target chunk size in characters (default: 400)

***

### minChunkSize?

> `optional` **minChunkSize**: `number`

Defined in: [src/lib/memoryEngine/chunking.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/chunking.ts#14)

Minimum chunk size to create (default: 50)
