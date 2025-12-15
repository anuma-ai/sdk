# memoryStorageSchema

> `const` **memoryStorageSchema**: `Readonly`\<\{ `tables`: `TableMap`; `unsafeSql?`: (`_`, `__`) => `string`; `version`: `number`; \}\>

Defined in: [src/lib/memoryStorage/schema.ts:9](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/schema.ts#L9)

WatermelonDB schema for memory storage

Defines the memories table for storing extracted user memories
with support for vector embeddings for semantic search.
