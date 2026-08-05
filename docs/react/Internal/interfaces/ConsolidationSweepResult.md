# ConsolidationSweepResult

Defined in: [src/lib/memory/types.ts:557](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#557)

Counts from one consolidation sweep, for UI surfacing / telemetry.
Count-only by design — memory CONTENT is never logged or returned.

## Properties

### clustersDropped

> **clustersDropped**: `number`

Defined in: [src/lib/memory/types.ts:570](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#570)

Clusters deferred to a later sweep because the per-sweep cluster cap was
hit — surfaced (never silently truncated) so bounded coverage is honest.

***

### clustersFound

> **clustersFound**: `number`

Defined in: [src/lib/memory/types.ts:561](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#561)

Multi-row near-duplicate clusters found (before the per-sweep cap).

***

### dryRun

> **dryRun**: `boolean`

Defined in: [src/lib/memory/types.ts:572](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#572)

True when the sweep only computed what it WOULD change and applied nothing.

***

### embeddedBackfilled

> **embeddedBackfilled**: `number`

Defined in: [src/lib/memory/types.ts:567](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#567)

Rows without a vector that were embedded this sweep (backfill).

***

### junkDeleted

> **junkDeleted**: `number`

Defined in: [src/lib/memory/types.ts:565](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#565)

Content-free junk rows soft-deleted (tombstoned) this sweep.

***

### scanned

> **scanned**: `number`

Defined in: [src/lib/memory/types.ts:559](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#559)

Active rows the scan considered this sweep.

***

### superseded

> **superseded**: `number`

Defined in: [src/lib/memory/types.ts:563](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#563)

Stale duplicates retired (superseded → a surviving row) this sweep.
