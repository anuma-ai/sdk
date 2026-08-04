# MessageOrigin

> **MessageOrigin** = `"tool_result"`

Defined in: [src/lib/db/chat/types.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#89)

Which producer synthesised a message, for rows the user did not type and the
UI does not render. Set at write time by that producer; a union so further
synthetic kinds can be added without another column.

* `tool_result`: the hidden `[Tool Execution Results]` row built from a
  turn's auto-executed tool results. Skipped by the embedding sweep (see
  `memoryEngine/embeddings`).
* undefined/null: a normal message, or any row written before v44.

Stored in the plaintext `origin` column — never encrypted. The deferred
embedding sweep that has to honour it runs without wallet context, so an
encrypted flag would be unreadable exactly where it matters and the skip
would fail open.
