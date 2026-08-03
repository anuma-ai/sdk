# MemoryToVerify

> **MemoryToVerify** = `Pick`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md), `"uniqueId"` | `"content"` | `"source"` | `"sourceChunkIds"`>

Defined in: [src/lib/memory/verifySupport.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#174)

The row fields verification reads. A `StoredVaultMemory` satisfies this
structurally, so callers pass their rows straight through; deriving it with
`Pick` keeps the field names and types tied to the row rather than
re-declared next to it.
