# RetainContext

Defined in: [src/lib/memory/retain.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/retain.ts#54)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/retain.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/retain.ts#56)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/memory/retain.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/retain.ts#67)

Optional AbortSignal bounding the embedding request(s) this retain drives
(query embed in `prepareVaultCandidates`, plus any create/update re-embed).
When it aborts, the embed rejects with an `AbortError` (no retry — an abort
is terminal), retain throws, and the caller's single-write fallback runs.
Threaded onto `embeddingOptions.signal` for every embed call below. Omit on
the recall/extraction paths — only the `memory_vault_save` tool sets it, to
cap the create wait so a hung portal can't stall the chat turn.

***

### vaultCache

> **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/retain.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/retain.ts#57)

***

### vaultCtx

> **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/retain.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/retain.ts#55)
