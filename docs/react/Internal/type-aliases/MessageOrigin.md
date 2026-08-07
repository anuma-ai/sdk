# MessageOrigin

> **MessageOrigin** = `"tool_result"` | `"chunks_discarded"`

Defined in: [src/lib/db/chat/types.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#100)

Provenance for a row that needs handling the content cannot justify. Set at
write time by whoever produced or repaired the row; a union so further kinds
can be added without another column.

Read it as an enum, never as a boolean. The values do NOT share a meaning:
`tool_result` marks a synthetic row that is both unindexed and hidden, while
`chunks_discarded` marks an ordinary typed message that is unindexed and still
rendered. Any predicate that collapses this to "has an origin" hides real
messages (see `isToolResultsRow`).

* `tool_result`: the hidden `[Tool Execution Results]` row built from a
  turn's auto-executed tool results. Skipped by the embedding sweep (see
  `memoryEngine/embeddings`) AND hidden from the transcript.
* `chunks_discarded`: an ordinary, still-rendered message whose chunk vectors
  were built over `enc:v3:` ciphertext (sdk#864) and have been discarded
  rather than re-embedded at the user's own expense (client#5618). Skipped by
  the embedding sweep so nothing re-embeds it, but NOT hidden — only
  `tool_result` hides a row, and `isToolResultsRow` is what draws that line.
* undefined/null: a normal message, or any row written before v44.

Stored in the plaintext `origin` column — never encrypted. The deferred
embedding sweep that has to honour it runs without wallet context, so an
encrypted flag would be unreadable exactly where it matters and the skip
would fail open.
