# ConsolidationSweepResult

Defined in: [src/lib/memory/types.ts:463](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#463)

Counts from one consolidation sweep, for UI surfacing / telemetry.
Count-only by design — memory CONTENT is never logged or returned.

## Properties

### clustersDropped

> **clustersDropped**: `number`

Defined in: [src/lib/memory/types.ts:476](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#476)

Clusters deferred to a later sweep because the per-sweep cluster cap was
hit — surfaced (never silently truncated) so bounded coverage is honest.

***

### clustersFound

> **clustersFound**: `number`

Defined in: [src/lib/memory/types.ts:467](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#467)

Multi-row near-duplicate clusters found (before the per-sweep cap).

***

### dryRun

> **dryRun**: `boolean`

Defined in: [src/lib/memory/types.ts:478](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#478)

True when the sweep only computed what it WOULD change and applied nothing.

***

### embeddedBackfilled

> **embeddedBackfilled**: `number`

Defined in: [src/lib/memory/types.ts:473](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#473)

Rows without a vector that were embedded this sweep (backfill).

***

### junkDeleted

> **junkDeleted**: `number`

Defined in: [src/lib/memory/types.ts:471](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#471)

Content-free junk rows soft-deleted (tombstoned) this sweep.

***

### scanned

> **scanned**: `number`

Defined in: [src/lib/memory/types.ts:465](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#465)

Active rows the scan considered this sweep.

***

### superseded

> **superseded**: `number`

Defined in: [src/lib/memory/types.ts:469](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#469)

Stale duplicates retired (superseded → a surviving row) this sweep.
