# ToolMatchOptions

Defined in: [src/lib/tools/serverTools.ts:644](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#644)

Options for findMatchingTools

## Properties

### ambiguityThreshold?

> `optional` **ambiguityThreshold**: `number`

Defined in: [src/lib/tools/serverTools.ts:660](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#660)

Top score must be above this to skip the ambiguity check (default: 0.55)

***

### filterAmbiguous?

> `optional` **filterAmbiguous**: `boolean`

Defined in: [src/lib/tools/serverTools.ts:658](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#658)

When enabled, returns empty results if the top match doesn't clearly
stand out from the runner-up. This filters out generic prompts like
"hello" or "tell me a joke" where all tools score similarly low.

A match is considered ambiguous when:

* The top score is below `ambiguityThreshold` (default: 0.55), AND
* The gap between the top score and the runner-up is below `minLead` (default: 0.025)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/tools/serverTools.ts:646](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#646)

Maximum number of tools to return (default: 10)

***

### minLead?

> `optional` **minLead**: `number`

Defined in: [src/lib/tools/serverTools.ts:662](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#662)

Minimum gap between top and runner-up scores (default: 0.025)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/tools/serverTools.ts:648](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#648)

Minimum similarity threshold 0-1 (default: 0.3)
