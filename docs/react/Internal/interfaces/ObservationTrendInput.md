# ObservationTrendInput

Defined in: src/lib/memory/observationTrend.ts:31

## Properties

### createdAt

> **createdAt**: `number` | `Date`

Defined in: src/lib/memory/observationTrend.ts:32

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: src/lib/memory/observationTrend.ts:38

C3 re-observation watermark (Unix ms). When null/undefined, the fact
has never been merged-into since the column landed — treat `createdAt`
as last-seen.

***

### proofCount?

> `optional` **proofCount**: `number` | `null`

Defined in: src/lib/memory/observationTrend.ts:40

Times this fact has been retained/merged. Defaults to 1.
