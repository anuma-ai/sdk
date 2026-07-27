# VaultMemoryVisibility

> **VaultMemoryVisibility** = `"private"` | `"public"`

Defined in: [src/lib/db/memoryVault/types.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#16)

People Nearby cross-user visibility. ORTHOGONAL to `scope` (model access):

* `private`: local-only (default; null column grandfathered as private)
* `public`: embedding + plaintext may be published (compatibility matching,
  profile display, discovery answers, digital-twin prompts)

TWO TIERS ONLY (decided 2026-07-27). An earlier design had a middle
`matchable` tier that published a memory's embedding while keeping its text
on-device; it was dropped, so a memory either never leaves the device or is
published with its content. Any unrecognised stored value — including a
`matchable` row written by a pre-release build — reads as `private`, which is
the fail-safe direction: it un-publishes rather than exposes.
