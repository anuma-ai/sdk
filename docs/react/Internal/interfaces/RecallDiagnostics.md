# RecallDiagnostics

Defined in: [src/lib/memory/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#258)

Per-call recall observability payload (see [RecallOptions.onDiagnostics](RecallOptions.md#ondiagnostics)).
All timings are wall-clock milliseconds. Lane counts are post-dedupe,
pre-fusion. Intended to be forwarded to a metrics sink (e.g. PostHog).

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#264)

Total candidates considered before truncation.

***

### chunkCount

> **chunkCount**: `number`

Defined in: [src/lib/memory/types.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#270)

Chunks the chunk lane returned (post-dedupe, pre-fusion).

***

### degraded

> **degraded**: [`RecallDegradation`](../type-aliases/RecallDegradation.md)\[]

Defined in: [src/lib/memory/types.ts:285](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#285)

Soft-degradation signals that fired this call (empty when clean).

***

### factCount

> **factCount**: `number`

Defined in: [src/lib/memory/types.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#268)

Facts the fact lane returned (post-dedupe, pre-fusion).

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#262)

Whether the cross-encoder actually reranked the fact lane this call.

***

### timings

> **timings**: `object`

Defined in: [src/lib/memory/types.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#272)

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

Defined in: [src/lib/memory/types.ts:260](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#260)

Budget actually executed (may have downgraded from the requested one).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#266)

Total vault size when the fact lane ran (absent if it didn't).
