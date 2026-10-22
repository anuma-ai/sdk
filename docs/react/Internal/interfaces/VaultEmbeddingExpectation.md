# VaultEmbeddingExpectation

Defined in: [src/lib/db/memoryVault/operations.ts:2264](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2264)

What a re-embed was computed from. A search embeds a row it READ earlier, so
by the time the vector lands the row may have been edited (the tool clears
the embedding on an edit, a consolidation rewrites content under
preserveUpdatedAt); writing then would pin a vector for text that is gone.

## Properties

### content?

> `optional` **content**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:2266](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2266)

Plaintext content the vector was computed from.

***

### updatedAt?

> `optional` **updatedAt**: `number`

Defined in: [src/lib/db/memoryVault/operations.ts:2268](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2268)

`updatedAt` (ms) of the row as it was read.
