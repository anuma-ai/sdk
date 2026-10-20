# ToolMatchOptions

Defined in: [src/lib/tools/serverTools.ts:821](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#821)

Options for findMatchingTools

## Properties

### ambiguityThreshold?

> `optional` **ambiguityThreshold**: `number`

Defined in: [src/lib/tools/serverTools.ts:837](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#837)

Top score must be above this to skip the ambiguity check (default: 0.55)

***

### filterAmbiguous?

> `optional` **filterAmbiguous**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:835](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#835)

When enabled, returns empty results if the top match doesn't clearly
stand out from the runner-up. This filters out generic prompts like
"hello" or "tell me a joke" where all tools score similarly low.

A match is considered ambiguous when:

* The top score is below `ambiguityThreshold` (default: 0.55), AND
* The gap between the top score and the runner-up is below `minLead` (default: 0.04)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/tools/serverTools.ts:823](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#823)

Maximum number of tools to return (default: 5)

***

### minLead?

> `optional` **minLead**: `number`

Defined in: [src/lib/tools/serverTools.ts:839](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#839)

Minimum gap between top and runner-up scores (default: 0.04)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/tools/serverTools.ts:825](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#825)

Minimum similarity threshold 0-1 (default: 0.3)

***

### relevanceRatio?

> `optional` **relevanceRatio**: `number`

Defined in: [src/lib/tools/serverTools.ts:846](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#846)

Only keep tools scoring at least this fraction of the top match's score.
Filters out the tail of weakly-related tools that fill up the limit.
For example, 0.85 means a tool must score within 85% of the top match.
Set to 0 to disable. Default: 0 (disabled).
