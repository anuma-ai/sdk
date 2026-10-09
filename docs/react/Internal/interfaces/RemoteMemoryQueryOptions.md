# RemoteMemoryQueryOptions

Defined in: [src/lib/memory/store/remotePersistence.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#75)

Server-side filters on plaintext metadata; content and kind\_value stay encrypted and filter on the device.

## Extends

* [`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md)

## Properties

### archived\_only?

> `optional` **archived\_only**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#77)

***

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#85)

***

### fact\_types?

> `optional` **fact\_types**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#51)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`fact_types`](RemoteMemoryReadFilters.md#fact_types)

***

### include\_archived?

> `optional` **include\_archived**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#48)

**Inherited from**

[`RemoteMemoryReadFilters`](RemoteMemoryReadFilters.md).[`include_archived`](RemoteMemoryReadFilters.md#include_archived)

***

### include\_deleted?

> `optional` **include\_deleted**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#76)

***

### include\_embeddings?

> `optional` **include\_embeddings**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#87)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#86)

***

### memory\_ids?

> `optional` **memory\_ids**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#80)

***

### order?

> `optional` **order**: `"created"` | `"updated"` | `"archived"` | `"changed"`

Defined in: [src/lib/memory/store/remotePersistence.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#84)

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#78)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/memory/store/remotePersistence.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#88)

***

### topics?

> `optional` **topics**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#82)

Topic names, matched trimmed and lowercased; re-check exact matches on the device.

***

### updated\_after?

> `optional` **updated\_after**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#83)

***

### visibility?

> `optional` **visibility**: `string`\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#79)
