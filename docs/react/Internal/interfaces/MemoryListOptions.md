# MemoryListOptions

Defined in: [src/lib/memory/store/types.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#27)

Read filter for [MemoryStore.list](MemoryStore.md#list). Same semantics as the vault read
ops: every non-visible state (deleted, archived, quarantined, superseded) is
hidden by default and has its own opt-in flag.

## Properties

### factTypes?

> `optional` **factTypes**: `string`\[]

Defined in: [src/lib/memory/store/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#34)

***

### includeArchived?

> `optional` **includeArchived**: `boolean`

Defined in: [src/lib/memory/store/types.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#39)

***

### includeDeleted?

> `optional` **includeDeleted**: `boolean`

Defined in: [src/lib/memory/store/types.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#38)

Memory Graph "forgotten" nodes — rows carry `isDeleted: true`.

***

### includeQuarantined?

> `optional` **includeQuarantined**: `boolean`

Defined in: [src/lib/memory/store/types.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#40)

***

### includeSuperseded?

> `optional` **includeSuperseded**: `boolean`

Defined in: [src/lib/memory/store/types.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#42)

Memory history — rows carry `supersededBy`.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/store/types.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#31)

***

### memoryIds?

> `optional` **memoryIds**: `string`\[]

Defined in: [src/lib/memory/store/types.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#33)

Restrict to these ids. Absent or foreign ids are dropped, never an error.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/store/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#28)

***

### since?

> `optional` **since**: `Date`

Defined in: [src/lib/memory/store/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#30)

Only memories updated after this instant (results then sort by `updatedAt`).

***

### visibility?

> `optional` **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)\[]

Defined in: [src/lib/memory/store/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#36)

People Nearby visibility filter; a legacy NULL column reads as "private".
