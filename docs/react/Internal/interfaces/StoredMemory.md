# StoredMemory

Defined in: [src/lib/db/memory/types.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L33)

## Extends

* [`MemoryItem`](MemoryItem.md)

## Extended by

* [`StoredMemoryWithSimilarity`](StoredMemoryWithSimilarity.md)

## Properties

### accessedAt

> **accessedAt**: `Date`

Defined in: [src/lib/db/memory/types.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L39)

***

### compositeKey

> **compositeKey**: `string`

Defined in: [src/lib/db/memory/types.ts:35](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L35)

***

### confidence

> **confidence**: `number`

Defined in: [src/lib/db/memory/types.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L20)

**Inherited from**

[`MemoryItem`](MemoryItem.md).[`confidence`](MemoryItem.md#confidence)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memory/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L37)

***

### embedding?

> `optional` **embedding**: `number`\[]

Defined in: [src/lib/db/memory/types.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L40)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memory/types.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L41)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memory/types.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L42)

***

### key

> **key**: `string`

Defined in: [src/lib/db/memory/types.ts:17](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L17)

**Inherited from**

[`MemoryItem`](MemoryItem.md).[`key`](MemoryItem.md#key)

***

### namespace

> **namespace**: `string`

Defined in: [src/lib/db/memory/types.ts:16](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L16)

**Inherited from**

[`MemoryItem`](MemoryItem.md).[`namespace`](MemoryItem.md#namespace)

***

### pii

> **pii**: `boolean`

Defined in: [src/lib/db/memory/types.ts:21](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L21)

**Inherited from**

[`MemoryItem`](MemoryItem.md).[`pii`](MemoryItem.md#pii)

***

### previousValue?

> `optional` **previousValue**: `string`

Defined in: [src/lib/db/memory/types.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L46)

The previous value before this memory replaced it

***

### rawEvidence

> **rawEvidence**: `string`

Defined in: [src/lib/db/memory/types.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L19)

**Inherited from**

[`MemoryItem`](MemoryItem.md).[`rawEvidence`](MemoryItem.md#rawevidence)

***

### singular?

> `optional` **singular**: `boolean`

Defined in: [src/lib/db/memory/types.ts:23](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L23)

Whether only one value is allowed for this key. If true, new values supersede old ones. If false/undefined, multiple values can coexist.

**Inherited from**

[`MemoryItem`](MemoryItem.md).[`singular`](MemoryItem.md#singular)

***

### supersedes?

> `optional` **supersedes**: `string`

Defined in: [src/lib/db/memory/types.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L44)

ID of the memory this one superseded (replaced)

***

### type

> **type**: [`MemoryType`](../type-aliases/MemoryType.md)

Defined in: [src/lib/db/memory/types.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L15)

**Inherited from**

[`MemoryItem`](MemoryItem.md).[`type`](MemoryItem.md#type)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memory/types.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L34)

***

### uniqueKey

> **uniqueKey**: `string`

Defined in: [src/lib/db/memory/types.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L36)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memory/types.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L38)

***

### value

> **value**: `string`

Defined in: [src/lib/db/memory/types.ts:18](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L18)

**Inherited from**

[`MemoryItem`](MemoryItem.md).[`value`](MemoryItem.md#value)
