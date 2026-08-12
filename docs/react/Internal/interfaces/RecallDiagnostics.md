# RecallDiagnostics

Defined in: [src/lib/memory/types.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#317)

Per-call recall observability payload (see [RecallOptions.onDiagnostics](RecallOptions.md#ondiagnostics)).
All timings are wall-clock milliseconds. Lane counts are post-dedupe,
pre-fusion. Intended to be forwarded to a metrics sink (e.g. PostHog).

## Properties

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#323)

Total candidates considered before truncation.

***

### chunkCount

> **chunkCount**: `number`

Defined in: [src/lib/memory/types.ts:361](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#361)

Chunks the chunk lane returned (post-dedupe, pre-fusion).

***

### decryptLast?

> `optional` **decryptLast**: `boolean`

Defined in: [src/lib/memory/types.ts:336](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#336)

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

Defined in: [src/lib/memory/types.ts:407](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#407)

Soft-degradation signals that fired this call (empty when clean).

***

### factCount

> **factCount**: `number`

Defined in: [src/lib/memory/types.ts:359](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#359)

Facts the fact lane returned (post-dedupe, pre-fusion).

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#321)

Whether the cross-encoder actually reranked the fact lane this call.

***

### timings

> **timings**: `object`

Defined in: [src/lib/memory/types.ts:363](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#363)

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

**queryEmbed**

> **queryEmbed**: `number`

The query embed's share of [factLane](#timings) — one portal round trip.

Also a SUBSET of `factLane`. Together with `rerank` this makes the lane
decomposable: `factLane - queryEmbed - rerank` is the local work (vault
read, decrypt, BM25/cosine fusion), and each of the three implies a
completely different fix.

0 when the lane returned before embedding, which includes every empty
vault — `prepareVaultCandidates` short-circuits first. That is why the
fast `vault_size = 0` population never established a baseline for this
cost, and why the ~850ms floor on the smallest NON-empty vaults had no
attributable owner.

**rerank**

> **rerank**: `number`

The cross-encoder's share of [factLane](#timings) — wall-clock spent inside
`rerankPairs`. Billed even when the CE threw partway through, because a
rerank that burned three seconds and then failed still cost them.

A SUBSET of `factLane`, not a sibling: read `factLane - rerank` for
everything else the lane did (query embed, vault read, fused ranking).
0 when the CE did not run; `reranked` is what distinguishes that from a
rerank that cost nothing.

Exists because #845 spent three rounds arguing about which stage inside
the fact lane dominated — whole-vault read, then admission window, then
the CE — with one aggregate number for all of them. Every hypothesis was
an inference; this makes the question a query.

**total**

> **total**: `number`

Whole `recall()` call.

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#319)

Budget actually executed (may have downgraded from the requested one).

***

### vaultRowsDecrypted?

> `optional` **vaultRowsDecrypted**: `number`

Defined in: [src/lib/memory/types.ts:346](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#346)

Rows the fact lane paid to decrypt. Absent when it didn't run.

Read against [RecallDiagnostics.vaultSize](#vaultsize) — that ratio is the whole
point. `decryptLast` true with `vaultRowsDecrypted` ≈ `vaultSize` means the
admission window is admitting the entire vault and the projection is buying
nothing. Far below `vaultSize` with latency unchanged means the decrypt was
never the cost.

***

### vaultRowsEmbedded?

> `optional` **vaultRowsEmbedded**: `number`

Defined in: [src/lib/memory/types.ts:357](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#357)

Rows the fact lane had to re-embed through the portal because their stored
vector was unusable — stale `embedding_model`, wrong dimension, or
unparseable. Absent when the fact lane didn't run.

Expected to be 0 on a healthy vault: rows are embedded at write time and the
re-embed writes the current model back, so a persistently non-zero value
means the writeback is not sticking and every turn is paying for it. On the
LEGACY read path this batch is uncapped, so it can be the whole vault.

***

### vaultSize?

> `optional` **vaultSize**: `number`

Defined in: [src/lib/memory/types.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#325)

Total vault size when the fact lane ran (absent if it didn't).
