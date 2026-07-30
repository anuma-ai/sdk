# Budget

> **Budget** = `"low"` | `"mid"` | `"high"`

Defined in: [src/lib/memory/types.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#38)

Budget controls retrieval depth/cost. Higher budgets enable more
candidate sources and the cross-encoder reranker.

* `low`: cosine + BM25 + recency. No reranker. Mobile default.
* `mid`: + cross-encoder rerank.
* `high`: + multi-hop graph traversal. LLM-free — query decomposition
  (when wanted) lives in the tool/agent layer ([createRecallTool](../functions/createRecallTool.md)),
  not inside `recall()` itself (719/B4).
