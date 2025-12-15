# StoredMemoryWithSimilarity

Defined in: [src/lib/memoryStorage/types.ts:66](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L66)

Memory with similarity score (returned from semantic search)

## Extends

- [`StoredMemory`](StoredMemory.md)

## Properties

### compositeKey

> **compositeKey**: `string`

Defined in: [src/lib/memoryStorage/types.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L48)

Composite key (namespace:key) for efficient lookups

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`compositeKey`](StoredMemory.md#compositekey)

***

### confidence

> **confidence**: `number`

Defined in: [src/lib/memoryStorage/types.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L44)

Confidence score (0-1)

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`confidence`](StoredMemory.md#confidence)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memoryStorage/types.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L52)

ISO timestamp

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`createdAt`](StoredMemory.md#createdat)

***

### embedding?

> `optional` **embedding**: `number`[]

Defined in: [src/lib/memoryStorage/types.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L56)

Embedding vector for semantic search

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`embedding`](StoredMemory.md#embedding)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/memoryStorage/types.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L58)

Model used to generate embedding

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`embeddingModel`](StoredMemory.md#embeddingmodel)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/memoryStorage/types.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L60)

Soft delete flag

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`isDeleted`](StoredMemory.md#isdeleted)

***

### key

> **key**: `string`

Defined in: [src/lib/memoryStorage/types.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L38)

Key within the namespace

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`key`](StoredMemory.md#key)

***

### namespace

> **namespace**: `string`

Defined in: [src/lib/memoryStorage/types.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L36)

Namespace for grouping related memories

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`namespace`](StoredMemory.md#namespace)

***

### pii

> **pii**: `boolean`

Defined in: [src/lib/memoryStorage/types.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L46)

Whether this memory contains PII

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`pii`](StoredMemory.md#pii)

***

### rawEvidence

> **rawEvidence**: `string`

Defined in: [src/lib/memoryStorage/types.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L42)

Raw evidence from which this memory was extracted

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`rawEvidence`](StoredMemory.md#rawevidence)

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryStorage/types.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L68)

Cosine similarity score (0-1)

***

### type

> **type**: [`MemoryType`](../type-aliases/MemoryType.md)

Defined in: [src/lib/memoryStorage/types.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L34)

Memory type classification

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`type`](StoredMemory.md#type)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryStorage/types.ts:32](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L32)

Primary key, unique memory identifier (WatermelonDB auto-generated)

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`uniqueId`](StoredMemory.md#uniqueid)

***

### uniqueKey

> **uniqueKey**: `string`

Defined in: [src/lib/memoryStorage/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L50)

Unique key (namespace:key:value) for deduplication

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`uniqueKey`](StoredMemory.md#uniquekey)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/memoryStorage/types.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L54)

ISO timestamp

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`updatedAt`](StoredMemory.md#updatedat)

***

### value

> **value**: `string`

Defined in: [src/lib/memoryStorage/types.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L40)

The memory value/content

#### Inherited from

[`StoredMemory`](StoredMemory.md).[`value`](StoredMemory.md#value)
