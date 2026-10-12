# ScoreProfileSalienceOptions

Defined in: [src/lib/memory/profileSalience.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/profileSalience.ts#50)

## Properties

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`, `number`>>

Defined in: [src/lib/memory/profileSalience.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/profileSalience.ts#52)

Override type weights (merged over [DEFAULT\_PROFILE\_FACT\_TYPE\_WEIGHTS](../variables/DEFAULT_PROFILE_FACT_TYPE_WEIGHTS.md)).

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memory/profileSalience.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/profileSalience.ts#56)

Proof-count α. Default: [DEFAULT\_PROFILE\_PROOF\_ALPHA](../variables/DEFAULT_PROFILE_PROOF_ALPHA.md).

***

### trendMultipliers?

> `optional` **trendMultipliers**: `Partial`<`Record`<[`ObservationTrend`](../type-aliases/ObservationTrend.md), `number`>>

Defined in: [src/lib/memory/profileSalience.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/profileSalience.ts#54)

Override trend multipliers.
