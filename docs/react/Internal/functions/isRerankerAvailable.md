# isRerankerAvailable

> **isRerankerAvailable**(): `boolean` | `undefined`

Defined in: [src/lib/memory/reranker.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reranker.ts#65)

Whether the cross-encoder reranker can run in this environment.

* `true` — the model loaded successfully at least once.
* `false` — the optional `@huggingface/transformers` dependency is missing
  (e.g. React Native); reranking is permanently degraded to the fused
  ranking and no further load attempts are made.
* `undefined` — no rerank has been attempted yet, so availability is unknown.

## Returns

`boolean` | `undefined`
