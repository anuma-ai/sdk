# RemoteMemoryListOptions

Defined in: [src/lib/memory/store/remotePersistence.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#70)

## Extends

* `Omit`<[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md), `"fact_types"`>

## Properties

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#73)

***

### include\_archived?

> `optional` **include\_archived**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#64)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_archived`](RemoteMemoryReadFilters.md#include_archived)

***

### include\_deleted?

> `optional` **include\_deleted**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#71)

***

### include\_embeddings?

> `optional` **include\_embeddings**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#72)

***

### include\_quarantined?

> `optional` **include\_quarantined**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#65)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_quarantined`](RemoteMemoryReadFilters.md#include_quarantined)

***

### include\_superseded?

> `optional` **include\_superseded**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#66)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_superseded`](RemoteMemoryReadFilters.md#include_superseded)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#74)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/memory/store/remotePersistence.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#75)
