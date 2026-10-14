# RemoteMemoryListOptions

Defined in: [src/lib/memory/store/remotePersistence.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#56)

## Extends

* `Omit`<[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md), `"fact_types"`>

## Properties

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#59)

***

### include\_archived?

> `optional` **include\_archived**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#50)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_archived`](RemoteMemoryReadFilters.md#include_archived)

***

### include\_deleted?

> `optional` **include\_deleted**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#57)

***

### include\_embeddings?

> `optional` **include\_embeddings**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#58)

***

### include\_quarantined?

> `optional` **include\_quarantined**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#51)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_quarantined`](RemoteMemoryReadFilters.md#include_quarantined)

***

### include\_superseded?

> `optional` **include\_superseded**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#52)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_superseded`](RemoteMemoryReadFilters.md#include_superseded)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#60)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/memory/store/remotePersistence.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#61)
