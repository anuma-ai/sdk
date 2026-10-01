# MemoryListOptions

Defined in: src/lib/memory/store/types.ts:20

Read filter for [MemoryStore.list](MemoryStore.md#list). Same semantics as the vault read
ops: every non-visible state (deleted, archived, quarantined, superseded) is
hidden by default and has its own opt-in flag.

## Properties

### factTypes?

> `optional` **factTypes**: `string`\[]

Defined in: src/lib/memory/store/types.ts:28

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: src/lib/memory/store/types.ts:22

***

### includeArchived?

> `optional` **includeArchived**: `boolean`

Defined in: src/lib/memory/store/types.ts:33

***

### includeDeleted?

> `optional` **includeDeleted**: `boolean`

Defined in: src/lib/memory/store/types.ts:32

Memory Graph "forgotten" nodes — rows carry `isDeleted: true`.

***

### includeQuarantined?

> `optional` **includeQuarantined**: `boolean`

Defined in: src/lib/memory/store/types.ts:34

***

### includeSuperseded?

> `optional` **includeSuperseded**: `boolean`

Defined in: src/lib/memory/store/types.ts:36

Memory history — rows carry `supersededBy`.

***

### limit?

> `optional` **limit**: `number`

Defined in: src/lib/memory/store/types.ts:25

***

### memoryIds?

> `optional` **memoryIds**: `string`\[]

Defined in: src/lib/memory/store/types.ts:27

Restrict to these ids. Absent or foreign ids are dropped, never an error.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: src/lib/memory/store/types.ts:21

***

### since?

> `optional` **since**: `Date`

Defined in: src/lib/memory/store/types.ts:24

Only memories updated after this instant (results then sort by `updatedAt`).

***

### visibility?

> `optional` **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)\[]

Defined in: src/lib/memory/store/types.ts:30

People Nearby visibility filter; a legacy NULL column reads as "private".
