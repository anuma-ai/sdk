# RemoteMemoryQueryOptions

Defined in: [src/lib/memory/store/remotePersistence.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#90)

## Extends

* [`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md)

## Properties

### archived\_only?

> `optional` **archived\_only**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#92)

***

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#102)

***

### event\_time\_overlaps?

> `optional` **event\_time\_overlaps**: `object`

Defined in: [src/lib/memory/store/remotePersistence.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#100)

**end**

> **end**: `number`

**start**

> **start**: `number`

***

### fact\_types?

> `optional` **fact\_types**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#67)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`fact_types`](RemoteMemoryReadFilters.md#fact_types)

***

### include\_archived?

> `optional` **include\_archived**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#64)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_archived`](RemoteMemoryReadFilters.md#include_archived)

***

### include\_deleted?

> `optional` **include\_deleted**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#91)

***

### include\_embeddings?

> `optional` **include\_embeddings**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#104)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#103)

***

### memory\_ids?

> `optional` **memory\_ids**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#95)

***

### order?

> `optional` **order**: `"created"` | `"updated"` | `"archived"` | `"changed"`

Defined in: [src/lib/memory/store/remotePersistence.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#101)

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#93)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/memory/store/remotePersistence.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#105)

***

### topics?

> `optional` **topics**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#96)

***

### topics\_due?

> `optional` **topics\_due**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#98)

***

### topics\_extracted?

> `optional` **topics\_extracted**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#99)

***

### updated\_after?

> `optional` **updated\_after**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#97)

***

### visibility?

> `optional` **visibility**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#94)
