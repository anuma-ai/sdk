# RecallDiagnostics

Defined in: [src/lib/memory/types.ts:337](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#337)

Per-call recall observability payload (see [RecallOptions.onDiagnostics](RecallOptions.md#ondiagnostics)).
All timings are wall-clock milliseconds. Lane counts are post-dedupe,
pre-fusion. Intended to be forwarded to a metrics sink (e.g. PostHog).

## Properties

### admittedCount

> **admittedCount**: `number`

Defined in: [src/lib/memory/types.ts:391](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#391)

Memories actually RETURNED — `memories.length` after fusion, cross-lane
dedup and the `limit` slice.

`candidateCount` is what was considered; this is what the caller got, and
the two are routinely far apart (the fact lane pulls `limit * 2` when fusing).
Every consumer that wanted "how many memories did this turn actually get"
was reading `candidateCount` and overcounting.

***

### candidateCount

> **candidateCount**: `number`

Defined in: [src/lib/memory/types.ts:343](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#343)

Total candidates considered before truncation.

***

### chunkCount

> **chunkCount**: `number`

Defined in: [src/lib/memory/types.ts:381](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#381)

Chunks the chunk lane returned (post-dedupe, pre-fusion).

***

### decryptLast?

> `optional` **decryptLast**: `boolean`

Defined in: [src/lib/memory/types.ts:356](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#356)

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

Defined in: [src/lib/memory/types.ts:466](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#466)

Soft-degradation signals that fired this call (empty when clean).

***

### emptyReason

> **emptyReason**: [`RecallEmptyReason`](../type-aliases/RecallEmptyReason.md)

Defined in: [src/lib/memory/types.ts:420](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#420)

Why nothing came back — see [RecallEmptyReason](../type-aliases/RecallEmptyReason.md). `""` when something did.

***

### factCount

> **factCount**: `number`

Defined in: [src/lib/memory/types.ts:379](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#379)

Facts the fact lane returned (post-dedupe, pre-fusion).

***

### graphLaneCount

> **graphLaneCount**: `number`

Defined in: [src/lib/memory/types.ts:416](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#416)

Memory ids the W5 graph (entity) side lane contributed to the fusion.

***

### lowestAdmittedScore

> **lowestAdmittedScore**: `number`

Defined in: [src/lib/memory/types.ts:395](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#395)

Lowest score among the returned memories; -1 when none were returned.

***

### minScoreApplied

> **minScoreApplied**: `number`

Defined in: [src/lib/memory/types.ts:406](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#406)

The similarity floor the lane that produced these scores actually applied:
the fact lane's when it ran, otherwise the chunk lane's, and **-1 when
neither ran** (empty query, unwired context).

Per-lane rather than one constant because the two defaults differ (0.1 fact
/ 0.5 chunk), so a single seeded value reported a floor that a chunk-only
recall never applied. Reported next to the scores because the scores alone
cannot say what they cleared.

***

### reranked

> **reranked**: `boolean`

Defined in: [src/lib/memory/types.ts:341](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#341)

Whether the cross-encoder actually reranked the fact lane this call.

***

### temporalLaneCount

> **temporalLaneCount**: `number`

Defined in: [src/lib/memory/types.ts:418](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#418)

Memory ids the W6 temporal side lane contributed to the fusion.

***

### timings

> **timings**: `object`

Defined in: [src/lib/memory/types.ts:422](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#422)

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

### topScore

> **topScore**: `number`

Defined in: [src/lib/memory/types.ts:393](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#393)

Highest score among the returned memories; -1 when none were returned.

***

### truncated

> **truncated**: `boolean`

Defined in: [src/lib/memory/types.ts:414](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#414)

Whether the `limit` cut an ELIGIBLE result — recorded at the cut, not
derived from `candidateCount > limit`. In the fused path `candidateCount`
counts before provenance suppression, so a recall whose suppressed chunks
brought it under the limit would otherwise report a truncation that never
happened.

***

### usedBudget

> **usedBudget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:339](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#339)

Budget actually executed (may have downgraded from the requested one).

***

### vaultRowsDecrypted?

> `optional` **vaultRowsDecrypted**: `number`

Defined in: [src/lib/memory/types.ts:366](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#366)

Rows the fact lane paid to decrypt. Absent when it didn't run.

Read against [RecallDiagnostics.vaultSize](#vaultsize) — that ratio is the whole
point. `decryptLast` true with `vaultRowsDecrypted` ≈ `vaultSize` means the
admission window is admitting the entire vault and the projection is buying
nothing. Far below `vaultSize` with latency unchanged means the decrypt was
never the cost.

***

### vaultRowsEmbedded?

> `optional` **vaultRowsEmbedded**: `number`

Defined in: [src/lib/memory/types.ts:377](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#377)

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

Defined in: [src/lib/memory/types.ts:345](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#345)

Total vault size when the fact lane ran (absent if it didn't).
