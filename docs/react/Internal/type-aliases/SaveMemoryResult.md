# SaveMemoryResult

> **SaveMemoryResult** = `object`

Defined in: [src/lib/db/memory/types.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L60)

Result of a save operation indicating what action was taken

## Properties

### action

> **action**: `"created"` | `"updated"` | `"superseded"`

Defined in: [src/lib/db/memory/types.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L63)

Whether this was a new memory, an update to existing, or superseded an old value

***

### memory

> **memory**: [`StoredMemory`](../interfaces/StoredMemory.md)

Defined in: [src/lib/db/memory/types.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L61)

***

### supersededMemory?

> `optional` **supersededMemory**: [`StoredMemory`](../interfaces/StoredMemory.md)

Defined in: [src/lib/db/memory/types.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L65)

The memory that was superseded, if action is "superseded"
