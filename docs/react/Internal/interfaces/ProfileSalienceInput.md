# ProfileSalienceInput

Defined in: src/lib/memory/profileSalience.ts:49

## Extends

* [`ObservationTrendInput`](ObservationTrendInput.md)

## Properties

### createdAt

> **createdAt**: `number` | `Date`

Defined in: [src/lib/memory/observationTrend.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/observationTrend.ts#32)

**Inherited from**

[`ObservationTrendInput`](ObservationTrendInput.md).[`createdAt`](ObservationTrendInput.md#createdat)

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: src/lib/memory/profileSalience.ts:53

Extractor FactType; null/undefined → neutral weight (1.0).

***

### id

> **id**: `string`

Defined in: src/lib/memory/profileSalience.ts:51

Vault memory id — required for [rankProfileCandidates](../functions/rankProfileCandidates.md).

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memory/observationTrend.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/observationTrend.ts#38)

C3 re-observation watermark (Unix ms). When null/undefined, the fact
has never been merged-into since the column landed — treat `createdAt`
as last-seen.

**Inherited from**

[`ObservationTrendInput`](ObservationTrendInput.md).[`lastObservedAt`](ObservationTrendInput.md#lastobservedat)

***

### proofCount?

> `optional` **proofCount**: `number` | `null`

Defined in: [src/lib/memory/observationTrend.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/observationTrend.ts#40)

Times this fact has been retained/merged. Defaults to 1.

**Inherited from**

[`ObservationTrendInput`](ObservationTrendInput.md).[`proofCount`](ObservationTrendInput.md#proofcount)
