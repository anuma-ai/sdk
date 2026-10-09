# MemoryCreate

> **MemoryCreate** = `Pick`<[`CreateVaultMemoryOptions`](../interfaces/CreateVaultMemoryOptions.md), `"content"` | `"scope"` | `"factType"` | `"eventTime"` | `"embedding"` | `"embeddingModel"` | `"geohash"` | `"kind"` | `"kindValue"` | `"level"`>

Defined in: [src/lib/memory/store/types.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#47)

A manual memory save. Creation uses private visibility, manual provenance
and a proof count of one. Missing embeddings are filled in the background.
Publication uses `setVisibility`; extraction uses `retain`. Migration and
restore use the dedicated lower-level vault/import operations rather than
passing provenance, trust or publication metadata through manual creation.
