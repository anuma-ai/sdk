# CachedChunkVectors

Defined in: [src/lib/db/chat/operations.ts:1195](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1195)

Decrypted, model-native chunk vectors for one message, cached across recall
calls so the chunk lane doesn't re-decrypt + re-JSON.parse every message's
embeddings on every query. Keyed by message id; `version` is the message's
`updated_at` at cache time, so a re-embed (which bumps `updated_at`) misses
and repopulates. Vectors are stored Float32 — model-native precision, half
the RAM of float64 `number[]` — mirroring the vault embedding cache (#705).
Content text is deliberately NOT cached (see searchChunksOp): it isn't
needed for scoring, and keeping decrypted content out of the cache preserves
the SDK's data-at-rest posture.

## Properties

### chunks

> **chunks**: `Float32Array`<`ArrayBufferLike`>\[]

Defined in: [src/lib/db/chat/operations.ts:1204](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1204)

Per-chunk embedding vectors, index-aligned with the message's decrypted
`chunks` array (empty-vector chunks kept as zero-length placeholders so
indices stay aligned). Empty when the message has only a whole-message
`fallback` vector.

***

### fallback?

> `optional` **fallback**: `Float32Array`<`ArrayBufferLike`>

Defined in: [src/lib/db/chat/operations.ts:1206](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1206)

Whole-message vector when the message was embedded without chunking.

***

### version

> **version**: `number`

Defined in: [src/lib/db/chat/operations.ts:1197](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1197)

Message `updated_at` (ms) at cache time — the invalidation token.
