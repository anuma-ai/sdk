# RemoteMemoryListOptions

Defined in: [src/lib/memory/store/remotePersistence.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#54)

## Extends

* `Omit`<[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md), `"fact_types"`>

## Properties

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#57)

***

### include\_archived?

> `optional` **include\_archived**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#48)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_archived`](RemoteMemoryReadFilters.md#include_archived)

***

### include\_deleted?

> `optional` **include\_deleted**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#55)

***

### include\_embeddings?

> `optional` **include\_embeddings**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#56)

***

### include\_quarantined?

> `optional` **include\_quarantined**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#49)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_quarantined`](RemoteMemoryReadFilters.md#include_quarantined)

***

### include\_superseded?

> `optional` **include\_superseded**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#50)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_superseded`](RemoteMemoryReadFilters.md#include_superseded)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#58)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/memory/store/remotePersistence.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#59)
