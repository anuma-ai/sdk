# RecallDiagnostics

Defined in: [src/lib/memory/types.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#309)

Per-call recall observability payload (see [RecallOptions.onDiagnostics](RecallOptions.md#ondiagnostics)).
All timings are wall-clock milliseconds. Lane counts are post-dedupe,
pre-fusion. Intended to be forwarded to a metrics sink (e.g. PostHog).

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:315](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#315)

Total candidates considered before truncation.

***

### chunkCount

> **chunkCount**: `number`

Defined in: [src/lib/memory/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#321)

Chunks the chunk lane returned (post-dedupe, pre-fusion).

***

### degraded

> **degraded**: [`RecallDegradation`](../type-aliases/RecallDegradation.md)\[]

Defined in: [src/lib/memory/types.ts:354](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#354)

Soft-degradation signals that fired this call (empty when clean).

***

### factCount

> **factCount**: `number`

Defined in: [src/lib/memory/types.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#319)

Facts the fact lane returned (post-dedupe, pre-fusion).

***

### graphCount

> **graphCount**: `number`

Defined in: [src/lib/memory/types.ts:328](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#328)

Memory ids the W5 graph lane contributed this call, after the active-id
filter and the node cap. `0` means the lane returned nothing — it never ran
(no `entityCtx`), the extractor emitted no candidates, or no stored memory
shared one. Read with [graphSeedCount](#graphseedcount) to tell those apart.

***

### graphSeedCount

> **graphSeedCount**: `number`

Defined in: [src/lib/memory/types.ts:339](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#339)

Candidate entity names the query extractor emitted for the W5 lane.

The pair is the point: `0` seeds with `0` ids means extraction produced
nothing, while non-zero seeds with `0` ids means extraction worked and the
vault had nothing to match. That is exactly the distinction between "the
lane is silently dead" and "the lane correctly stayed quiet", and without
both numbers it is unmeasurable in production — which is how a dead lane
survived to become an epic item.

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:313](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#313)

Whether the cross-encoder actually reranked the fact lane this call.

***

### timings

> **timings**: `object`

Defined in: [src/lib/memory/types.ts:341](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#341)

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

Defined in: [src/lib/memory/types.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#311)

Budget actually executed (may have downgraded from the requested one).

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#317)

Total vault size when the fact lane ran (absent if it didn't).
