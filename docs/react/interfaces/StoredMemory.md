# StoredMemory

Defined in: [src/lib/memoryStorage/types.ts:30](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L30)

Stored memory record (what gets persisted to the database)

## Extended by

- [`StoredMemoryWithSimilarity`](StoredMemoryWithSimilarity.md)

## Properties

### compositeKey

> **compositeKey**: `string`

Defined in: [src/lib/memoryStorage/types.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L48)

Composite key (namespace:key) for efficient lookups

***

### confidence

> **confidence**: `number`

Defined in: [src/lib/memoryStorage/types.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L44)

Confidence score (0-1)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memoryStorage/types.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L52)

ISO timestamp

***

### embedding?

> `optional` **embedding**: `number`[]

Defined in: [src/lib/memoryStorage/types.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L56)

Embedding vector for semantic search

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/memoryStorage/types.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L58)

Model used to generate embedding

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/memoryStorage/types.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L60)

Soft delete flag

***

### key

> **key**: `string`

Defined in: [src/lib/memoryStorage/types.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L38)

Key within the namespace

***

### namespace

> **namespace**: `string`

Defined in: [src/lib/memoryStorage/types.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L36)

Namespace for grouping related memories

***

### pii

> **pii**: `boolean`

Defined in: [src/lib/memoryStorage/types.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L46)

Whether this memory contains PII

***

### rawEvidence

> **rawEvidence**: `string`

Defined in: [src/lib/memoryStorage/types.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L42)

Raw evidence from which this memory was extracted

***

### type

> **type**: [`MemoryType`](../type-aliases/MemoryType.md)

Defined in: [src/lib/memoryStorage/types.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L34)

Memory type classification

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryStorage/types.ts:32](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L32)

Primary key, unique memory identifier (WatermelonDB auto-generated)

***

### uniqueKey

> **uniqueKey**: `string`

Defined in: [src/lib/memoryStorage/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L50)

Unique key (namespace:key:value) for deduplication

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/memoryStorage/types.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L54)

ISO timestamp

***

### value

> **value**: `string`

Defined in: [src/lib/memoryStorage/types.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L40)

The memory value/content
