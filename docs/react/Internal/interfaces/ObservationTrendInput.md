# ObservationTrendInput

Defined in: [src/lib/memory/observationTrend.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/observationTrend.ts#18)

## Extended by

* [`ProfileSalienceInput`](ProfileSalienceInput.md)

## Properties

### createdAt

> **createdAt**: `number` | `Date`

Defined in: [src/lib/memory/observationTrend.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/observationTrend.ts#19)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memory/observationTrend.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/observationTrend.ts#25)

C3 re-observation watermark (Unix ms). When null/undefined, the fact
has never been merged-into since the column landed — treat `createdAt`
as last-seen.

***

### proofCount?

> `optional` **proofCount**: `number` | `null`

Defined in: [src/lib/memory/observationTrend.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/observationTrend.ts#27)

Times this fact has been retained/merged. Defaults to 1.
