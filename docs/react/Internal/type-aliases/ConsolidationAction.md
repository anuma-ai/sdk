# ConsolidationAction

> **ConsolidationAction** = `"create"` | `"update"` | `"noop"` | `"supersede"`

Defined in: [src/lib/memory/types.ts:483](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#483)

The consolidation LLM's decision for a candidate, when it made one. Reported
on [RetainResult.consolidation](../interfaces/RetainResult.md#consolidation) so a host can tell an LLM `noop` (the
fact already exists) from a cosine auto-merge — both arrive as
`action: "merge"` — and can read how often the model reaches for `supersede`
or `update` versus `create`. A degraded fallback create (LLM error, bad
response) carries no decision; `onFallback` reports those.
