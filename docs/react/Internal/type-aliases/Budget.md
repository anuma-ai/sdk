# Budget

> **Budget** = `"low"` | `"mid"` | `"high"`

Defined in: [src/lib/memory/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#35)

Budget controls retrieval depth/cost. Higher budgets enable more
candidate sources and the cross-encoder reranker.

* `low`: cosine + BM25 fusion only. No reranker. Mobile default.
* `mid`: + recency boost. Demo default.
* `high`: + cross-encoder rerank stage. Demo `budget: high` path.
