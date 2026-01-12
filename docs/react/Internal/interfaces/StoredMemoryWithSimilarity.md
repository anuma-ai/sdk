# StoredMemoryWithSimilarity

Defined in: [src/lib/db/memory/types.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L49)

## Extends

* [`StoredMemory`](StoredMemory.md)

## Properties

### accessedAt

> **accessedAt**: `Date`

Defined in: [src/lib/db/memory/types.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L39)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`accessedAt`](StoredMemory.md#accessedat)

***

### compositeKey

> **compositeKey**: `string`

Defined in: [src/lib/db/memory/types.ts:35](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L35)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`compositeKey`](StoredMemory.md#compositekey)

***

### confidence

> **confidence**: `number`

Defined in: [src/lib/db/memory/types.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L20)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`confidence`](StoredMemory.md#confidence)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memory/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L37)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`createdAt`](StoredMemory.md#createdat)

***

### embedding?

> `optional` **embedding**: `number`\[]

Defined in: [src/lib/db/memory/types.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L40)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`embedding`](StoredMemory.md#embedding)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memory/types.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L41)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`embeddingModel`](StoredMemory.md#embeddingmodel)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memory/types.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L42)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`isDeleted`](StoredMemory.md#isdeleted)

***

### key

> **key**: `string`

Defined in: [src/lib/db/memory/types.ts:17](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L17)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`key`](StoredMemory.md#key)

***

### namespace

> **namespace**: `string`

Defined in: [src/lib/db/memory/types.ts:16](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L16)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`namespace`](StoredMemory.md#namespace)

***

### pii

> **pii**: `boolean`

Defined in: [src/lib/db/memory/types.ts:21](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L21)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`pii`](StoredMemory.md#pii)

***

### previousValue?

> `optional` **previousValue**: `string`

Defined in: [src/lib/db/memory/types.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L46)

The previous value before this memory replaced it

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`previousValue`](StoredMemory.md#previousvalue)

***

### rawEvidence

> **rawEvidence**: `string`

Defined in: [src/lib/db/memory/types.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L19)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`rawEvidence`](StoredMemory.md#rawevidence)

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/memory/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L50)

***

### singular?

> `optional` **singular**: `boolean`

Defined in: [src/lib/db/memory/types.ts:23](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L23)

Whether only one value is allowed for this key. If true, new values supersede old ones. If false/undefined, multiple values can coexist.

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`singular`](StoredMemory.md#singular)

***

### supersedes?

> `optional` **supersedes**: `string`

Defined in: [src/lib/db/memory/types.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L44)

ID of the memory this one superseded (replaced)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`supersedes`](StoredMemory.md#supersedes)

***

### type

> **type**: [`MemoryType`](../type-aliases/MemoryType.md)

Defined in: [src/lib/db/memory/types.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L15)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`type`](StoredMemory.md#type)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memory/types.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L34)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`uniqueId`](StoredMemory.md#uniqueid)

***

### uniqueKey

> **uniqueKey**: `string`

Defined in: [src/lib/db/memory/types.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L36)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`uniqueKey`](StoredMemory.md#uniquekey)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memory/types.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L38)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`updatedAt`](StoredMemory.md#updatedat)

***

### value

> **value**: `string`

Defined in: [src/lib/db/memory/types.ts:18](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L18)

**Inherited from**

[`StoredMemory`](StoredMemory.md).[`value`](StoredMemory.md#value)
