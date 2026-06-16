# CreateServerToolsFilterOptions

Defined in: [src/lib/tools/serverTools.ts:1158](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1158)

Options for createServerToolsFilter.

## Properties

### excludeTools?

> `optional` **excludeTools**: `Iterable`<`string`, `any`, `any`>

Defined in: [src/lib/tools/serverTools.ts:1166](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1166)

Tool names to always drop from results, even when they match.

***

### matchOptions?

> `optional` **matchOptions**: [`ToolMatchOptions`](ToolMatchOptions.md)

Defined in: [src/lib/tools/serverTools.ts:1168](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1168)

Options forwarded to `findMatchingTools`.

***

### toolSets?

> `optional` **toolSets**: [`ToolSet`](ToolSet.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1164](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1164)

Tool sets to expand additively. When any anchor scores at or above the
set's `anchorMinSimilarity`, all members are included alongside the
original semantic matches.
