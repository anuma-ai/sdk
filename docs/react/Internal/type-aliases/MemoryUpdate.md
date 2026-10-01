# MemoryUpdate

> **MemoryUpdate** = `Pick`<[`UpdateVaultMemoryOptions`](../interfaces/UpdateVaultMemoryOptions.md), `"content"` | `"scope"` | `"folderId"` | `"factType"` | `"eventTime"` | `"embedding"` | `"embeddingModel"`>

Defined in: src/lib/memory/store/types.ts:47

The edits an app makes to an existing memory. Deliberately narrower than
[UpdateVaultMemoryOptions](../interfaces/UpdateVaultMemoryOptions.md): the re-observation knobs (`proofCountIncrement`,
`observationSourceIds`, `preserveUpdatedAt`, `restore`, `lastObservedAt`, …)
belong to `retain()` and backup sync, and an HTTP backend should never have
to accept them from a client.
