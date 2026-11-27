# MemoryAppProfile

Defined in: [src/lib/memory/appProfile.ts:5](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/appProfile.ts#5)

Per-app memory tuning applied to extraction, recall, context assembly and decay; omitted fields keep the SDK defaults.

## Properties

### extractionGuidance?

> `optional` **extractionGuidance**: `string`

Defined in: [src/lib/memory/appProfile.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/appProfile.ts#9)

App-specific rules appended to the default extraction system prompt.

***

### factMinScore?

> `optional` **factMinScore**: `number`

Defined in: [src/lib/memory/appProfile.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/appProfile.ts#15)

Score floor for the recall fact lane; an explicit `RecallOptions.minScore` wins. Default 0.1.

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"` | `"instruction"`, `number`>>

Defined in: [src/lib/memory/appProfile.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/appProfile.ts#13)

Per-fact-type score multipliers for the recall fact lane; an explicit `RecallOptions.factTypeWeights` wins.

***

### id

> **id**: `string`

Defined in: [src/lib/memory/appProfile.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/appProfile.ts#7)

Stable identifier for the profile, used in logs and eval output.

***

### maxContentLength?

> `optional` **maxContentLength**: `number`

Defined in: [src/lib/memory/appProfile.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/appProfile.ts#11)

Maximum characters in an extracted fact; longer candidates are dropped. Default 200.

***

### ttlByType?

> `optional` **ttlByType**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"` | `"instruction"`, `number`>>

Defined in: [src/lib/memory/appProfile.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/appProfile.ts#17)

Per-fact-type decay TTLs in milliseconds; an explicit `DecayPolicy.ttlByType` entry wins.
