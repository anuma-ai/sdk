# MemoryVerification

> **MemoryVerification** = `object` & { `status`: `"supported"` | `"unsupported"`; } | { `reason`: [`UnverifiableReason`](UnverifiableReason.md); `status`: `"unverifiable"`; } | { `reason`: [`UncheckedReason`](UncheckedReason.md); `status`: `"unchecked"`; }

Defined in: [src/lib/memory/verifySupport.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#222)

One memory's verdict.

Note what `unsupported` claims: the fact is not entailed by the provenance
RECORDED on the row, which is a weaker statement than "the fact is wrong".
Extraction's H4 fallback attributes a candidate with missing ids to the last
user message and persists no marker that it guessed, so a well-grounded fact
whose evidence lives in some other message lands here too, and post-hoc
nothing distinguishes it from a real miss (see this module's header). Review
copy should read as "we could not confirm this", not as an accusation.

## Type Declaration

### droppedSourceCount

> **droppedSourceCount**: `number`

Source ids that produced no evidence — deleted messages, ids that were
never chat rows, or (on `sources-unavailable`) reads that failed. Adds up
with `resolvedSourceCount` to the memory's distinct source ids on every
status where resolution actually ran, and the status says which kind of
not-resolving happened. Both are 0 on the two statuses decided before any
read — `not-auto-extracted` and `no-provenance` — including for a
`not-auto-extracted` row that does carry ids (an import's ids belong to
another device, so they are never resolved here): 0/0 there means "we did
not look", not "the row had no sources". Non-zero alongside
`supported`/`unsupported` means the verdict rests on partial evidence.

### resolvedSourceCount

> **resolvedSourceCount**: `number`

Source ids that resolved to real message text and were sent as evidence.

### uniqueId

> **uniqueId**: `string`

The memory's `uniqueId`, so results can be joined back to the input.
