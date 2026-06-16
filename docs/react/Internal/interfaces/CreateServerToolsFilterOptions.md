# CreateServerToolsFilterOptions

Defined in: [src/lib/tools/serverTools.ts:1142](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1142)

Options for createServerToolsFilter.

## Properties

### excludeTools?

> `optional` **excludeTools**: `Iterable`<`string`, `any`, `any`>

Defined in: [src/lib/tools/serverTools.ts:1150](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1150)

Tool names to always drop from results, even when they match.

***

### matchOptions?

> `optional` **matchOptions**: [`ToolMatchOptions`](ToolMatchOptions.md)

Defined in: [src/lib/tools/serverTools.ts:1152](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1152)

Options forwarded to `findMatchingTools`.

***

### toolSets?

> `optional` **toolSets**: [`ToolSet`](ToolSet.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1148](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1148)

Tool sets to expand additively. When any anchor scores at or above the
set's `anchorMinSimilarity`, all members are included alongside the
original semantic matches.
