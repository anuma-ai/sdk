# RecallEmptyReason

> **RecallEmptyReason** = `""` | `"empty-query"` | `"no-lanes"` | `"vault-empty"` | `"no-candidates"`

Defined in: [src/lib/memory/types.ts:330](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#330)

Why a recall returned nothing. `""` when it returned something, so the field
is always present and groupable rather than being absent on the healthy path.

The four are different problems: an empty query is a caller bug, no-lanes is a
context wiring bug (the requested kinds have no store), vault-empty is a new
user, and no-candidates is the only one that is about retrieval quality. They
were previously indistinguishable from outside — every one reported
`candidateCount: 0`.
