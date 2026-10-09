# MemoryUpdate

> **MemoryUpdate** = `Pick`<[`UpdateVaultMemoryOptions`](../interfaces/UpdateVaultMemoryOptions.md), `"content"` | `"scope"` | `"factType"` | `"eventTime"` | `"embedding"` | `"embeddingModel"` | `"kind"` | `"kindValue"` | `"level"`>

Defined in: [src/lib/memory/store/types.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#76)

The edits an app makes to an existing memory. Deliberately narrower than
[UpdateVaultMemoryOptions](../interfaces/UpdateVaultMemoryOptions.md): the re-observation knobs (`proofCountIncrement`,
`observationSourceIds`, `preserveUpdatedAt`, `restore`, `lastObservedAt`, …)
belong to `retain()` and backup sync, and an HTTP backend should never have
to accept them from a client. No `folderId` either: vault folders are gone
from the server surface (they leaked across tenants), so a remote backend
could not honour it.

Omitting `embedding` drops the stored vector (and its model tag) and the
store re-embeds the new content in the background — useChatStorage's edit
behaviour, so an edit never keeps a vector for text that is gone. Pass
`embedding` (with `embeddingModel`) only when you already have the new one.
