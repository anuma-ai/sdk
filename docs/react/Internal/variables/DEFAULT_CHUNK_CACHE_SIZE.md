# DEFAULT\_CHUNK\_CACHE\_SIZE

> `const` **DEFAULT\_CHUNK\_CACHE\_SIZE**: `5000` = `5000`

Defined in: [src/lib/memory/chunkVectorCache.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/chunkVectorCache.ts#9)

Default entry cap for the chunk-vector cache. Entries are keyed by message
id, so this bounds how many messages' decrypted chunk vectors stay resident.
Matches the vault cache default (#705).
