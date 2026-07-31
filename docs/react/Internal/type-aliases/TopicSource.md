# TopicSource

> **TopicSource** = `"user"` | `"auto"`

Defined in: [src/lib/db/entities/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/types.ts#52)

Who put a topic on a memory. Written to `memory_vault.topics` but not yet
READ anywhere — it exists so a later improvement can refresh the `auto`
entries of a curated memory while leaving `user` entries alone (today
`topics_user_managed` is all-or-nothing per memory) without needing a second
migration or backfill. Don't build that behavior off it yet.

When you do: a value written by the v42 backfill is NOT ground truth. Pre-v42
rows carry no per-topic provenance, so `backfillMemoryTopicsOp` derives it
from the per-memory `topics_user_managed` flag and stamps a curated legacy
row's every topic `user` — see the note at that derivation.
