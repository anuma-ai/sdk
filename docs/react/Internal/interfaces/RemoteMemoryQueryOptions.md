# RemoteMemoryQueryOptions

Defined in: [src/lib/memory/store/remotePersistence.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#76)

## Extends

* [`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md)

## Properties

### archived\_only?

> `optional` **archived\_only**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#78)

***

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#88)

***

### event\_time\_overlaps?

> `optional` **event\_time\_overlaps**: `object`

Defined in: [src/lib/memory/store/remotePersistence.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#86)

**end**

> **end**: `number`

**start**

> **start**: `number`

***

### fact\_types?

> `optional` **fact\_types**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#53)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`fact_types`](RemoteMemoryReadFilters.md#fact_types)

***

### include\_archived?

> `optional` **include\_archived**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#50)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_archived`](RemoteMemoryReadFilters.md#include_archived)

***

### include\_deleted?

> `optional` **include\_deleted**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#77)

***

### include\_embeddings?

> `optional` **include\_embeddings**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#90)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#89)

***

### memory\_ids?

> `optional` **memory\_ids**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#81)

***

### order?

> `optional` **order**: `"created"` | `"updated"` | `"archived"` | `"changed"`

Defined in: [src/lib/memory/store/remotePersistence.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#87)

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#79)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/memory/store/remotePersistence.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#91)

***

### topics?

> `optional` **topics**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#82)

***

### topics\_due?

> `optional` **topics\_due**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#84)

***

### topics\_extracted?

> `optional` **topics\_extracted**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#85)

***

### updated\_after?

> `optional` **updated\_after**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#83)

***

### visibility?

> `optional` **visibility**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#80)
