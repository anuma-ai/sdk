# UpdateMemoryOptions

Defined in: [src/lib/memoryStorage/types.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L98)

Options for updating a memory

## Properties

### confidence?

> `optional` **confidence**: `number`

Defined in: [src/lib/memoryStorage/types.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L110)

Confidence score (0-1)

***

### embedding?

> `optional` **embedding**: `number`[]

Defined in: [src/lib/memoryStorage/types.ts:114](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L114)

Optional embedding vector

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/memoryStorage/types.ts:116](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L116)

Optional embedding model name

***

### key?

> `optional` **key**: `string`

Defined in: [src/lib/memoryStorage/types.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L104)

Key within namespace

***

### namespace?

> `optional` **namespace**: `string`

Defined in: [src/lib/memoryStorage/types.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L102)

Namespace for grouping

***

### pii?

> `optional` **pii**: `boolean`

Defined in: [src/lib/memoryStorage/types.ts:112](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L112)

Whether this contains PII

***

### rawEvidence?

> `optional` **rawEvidence**: `string`

Defined in: [src/lib/memoryStorage/types.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L108)

Raw evidence text

***

### type?

> `optional` **type**: [`MemoryType`](../type-aliases/MemoryType.md)

Defined in: [src/lib/memoryStorage/types.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L100)

Memory type

***

### value?

> `optional` **value**: `string`

Defined in: [src/lib/memoryStorage/types.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L106)

Memory value/content
