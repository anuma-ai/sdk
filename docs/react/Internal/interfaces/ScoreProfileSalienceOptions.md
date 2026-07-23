# ScoreProfileSalienceOptions

Defined in: src/lib/memory/profileSalience.ts:64

## Properties

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`, `number`>>

Defined in: src/lib/memory/profileSalience.ts:66

Override type weights (merged over [DEFAULT\_PROFILE\_FACT\_TYPE\_WEIGHTS](../variables/DEFAULT_PROFILE_FACT_TYPE_WEIGHTS.md)).

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: src/lib/memory/profileSalience.ts:70

Proof-count α. Default: [DEFAULT\_PROFILE\_PROOF\_ALPHA](../variables/DEFAULT_PROFILE_PROOF_ALPHA.md).

***

### trendMultipliers?

> `optional` **trendMultipliers**: `Partial`<`Record`<[`ObservationTrend`](../type-aliases/ObservationTrend.md), `number`>>

Defined in: src/lib/memory/profileSalience.ts:68

Override trend multipliers.
