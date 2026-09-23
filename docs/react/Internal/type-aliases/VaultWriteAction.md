# VaultWriteAction

> **VaultWriteAction** = `"create"` | `"merge"` | `"update"` | `"supersede"` | `"suppressed"` | `"skip"`

Defined in: [src/lib/memoryVault/tool.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#58)

What a [VaultMemoryWriter](VaultMemoryWriter.md) reports back. The action set mirrors
`RetainResult.action` in `memory/retain` — restated here rather than imported
for the same reason MANUAL\_FACT\_TYPES is (memoryVault → memory import cycle).
