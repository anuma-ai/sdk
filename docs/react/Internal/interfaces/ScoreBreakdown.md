# ScoreBreakdown

Defined in: [src/lib/memory/types.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#39)

## Properties

### bm25?

> `optional` **bm25**: `number`

Defined in: [src/lib/memory/types.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#48)

***

### cosine?

> `optional` **cosine**: `number`

Defined in: [src/lib/memory/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#43)

Raw cosine similarity. Set only when callers compute it explicitly
(e.g. cosine-only `useFusion: false` search); the fusion path sets
[fused](#fused) instead so the label stays honest.

***

### fused?

> `optional` **fused**: `number`

Defined in: [src/lib/memory/types.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#47)

Composite score from the fused ranker (cosine + BM25 + RRF + recency

* proof boost). What `RankedMemory.score` carries when the fusion
  pipeline ran.

***

### recency?

> `optional` **recency**: `number`

Defined in: [src/lib/memory/types.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#49)

***

### rerank?

> `optional` **rerank**: `number`

Defined in: [src/lib/memory/types.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#50)

***

### rrfRank?

> `optional` **rrfRank**: `number`

Defined in: [src/lib/memory/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#52)

Final RRF rank (1-indexed) before any boost.
