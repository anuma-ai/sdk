# VaultMemoryVisibility

> **VaultMemoryVisibility** = `"private"` | `"public"`

Defined in: [src/lib/db/memoryVault/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#28)

LEGACY. This column no longer decides anything.

`scope === 'shared'` is now the single publication axis: it means the memory
is on the People Nearby profile, its text goes to the nearby server, and it
may inform what strangers see. `scope: 'private'` means it is not. There is
no second control, and scope no longer gates model access either — every
model tier reads every memory. Do NOT reason about publication from this
type; read `scope`.

The column survives in the schema and is still stamped on writes so that
stored rows stay readable by builds that predate the change. Nothing on a
current build reads it to make a decision.

Values, kept for tolerance of already-stored data:

* `private`: local-only (a null column reads as private)
* `public`: the row was published

TWO TIERS ONLY (decided 2026-07-27). An earlier design had a middle
`matchable` tier that published a memory's embedding while keeping its text
on-device; it was dropped. Any unrecognised stored value — including a
`matchable` row written by a pre-release build — reads as `private`, which is
the fail-safe direction: it un-publishes rather than exposes.
