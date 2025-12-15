# CreateMemoryOptions

Defined in: [src/lib/memoryStorage/types.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L74)

Options for creating a new memory

## Properties

### confidence

> **confidence**: `number`

Defined in: [src/lib/memoryStorage/types.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L86)

Confidence score (0-1)

***

### embedding?

> `optional` **embedding**: `number`[]

Defined in: [src/lib/memoryStorage/types.ts:90](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L90)

Optional embedding vector

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/memoryStorage/types.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L92)

Optional embedding model name

***

### key

> **key**: `string`

Defined in: [src/lib/memoryStorage/types.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L80)

Key within namespace

***

### namespace

> **namespace**: `string`

Defined in: [src/lib/memoryStorage/types.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L78)

Namespace for grouping

***

### pii

> **pii**: `boolean`

Defined in: [src/lib/memoryStorage/types.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L88)

Whether this contains PII

***

### rawEvidence

> **rawEvidence**: `string`

Defined in: [src/lib/memoryStorage/types.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L84)

Raw evidence text

***

### type

> **type**: [`MemoryType`](../type-aliases/MemoryType.md)

Defined in: [src/lib/memoryStorage/types.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L76)

Memory type

***

### value

> **value**: `string`

Defined in: [src/lib/memoryStorage/types.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L82)

Memory value/content
