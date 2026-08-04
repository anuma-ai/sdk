# RecallDiagnostics

Defined in: [src/lib/memory/types.ts:345](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#345)

Per-call recall observability payload (see [RecallOptions.onDiagnostics](RecallOptions.md#ondiagnostics)).
All timings are wall-clock milliseconds. Lane counts are post-dedupe,
pre-fusion. Intended to be forwarded to a metrics sink (e.g. PostHog).

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:351](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#351)

Total candidates considered before truncation.

***

### chunkCount

> **chunkCount**: `number`

Defined in: [src/lib/memory/types.ts:378](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#378)

Chunks the chunk lane returned (post-dedupe, pre-fusion).

***

### decryptLast?

> `optional` **decryptLast**: `boolean`

Defined in: [src/lib/memory/types.ts:364](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#364)

Which vault read path the fact lane actually executed: `true` for the
projected key scan that decrypts only the admission window, `false` for the
legacy whole-vault load. Absent when the fact lane didn't run.

Reported because "the option was passed" and "the branch ran" are different
facts, and #845 needed the second one: the projected path was enabled in
production and the p50 did not move, with no way to tell a flag that never
reached the bundle from a projection that isn't cheaper at that vault size.

***

### degraded

> **degraded**: [`RecallDegradation`](../type-aliases/RecallDegradation.md)\[]

Defined in: [src/lib/memory/types.ts:393](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#393)

Soft-degradation signals that fired this call (empty when clean).

***

### factCount

> **factCount**: `number`

Defined in: [src/lib/memory/types.ts:376](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#376)

Facts the fact lane returned (post-dedupe, pre-fusion).

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:349](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#349)

Whether the cross-encoder actually reranked the fact lane this call.

***

### timings

> **timings**: `object`

Defined in: [src/lib/memory/types.ts:380](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#380)

Wall-clock phase timings (ms).

**chunkLane**

> **chunkLane**: `number`

Chunk-lane search (`searchChunksOp`).

**factLane**

> **factLane**: `number`

Vault fact-lane search (`searchVaultMemoriesWithSize`).

**fuse**

> **fuse**: `number`

Cross-lane RRF fusion + provenance dedup after both lanes.

**prep**

> **prep**: `number`

Parallel query-embed + graph/temporal side-lane build.

**total**

> **total**: `number`

Whole `recall()` call.

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:347](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#347)

Budget actually executed (may have downgraded from the requested one).

***

### vaultRowsDecrypted?

> `optional` **vaultRowsDecrypted**: `number`

Defined in: [src/lib/memory/types.ts:374](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#374)

Rows the fact lane paid to decrypt. Absent when it didn't run.

Read against [RecallDiagnostics.vaultSize](#vaultsize) — that ratio is the whole
point. `decryptLast` true with `vaultRowsDecrypted` ≈ `vaultSize` means the
admission window is admitting the entire vault and the projection is buying
nothing. Far below `vaultSize` with latency unchanged means the decrypt was
never the cost.

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:353](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#353)

Total vault size when the fact lane ran (absent if it didn't).
