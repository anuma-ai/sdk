# CreateServerToolsFilterOptions

Defined in: [src/lib/tools/serverTools.ts:999](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#999)

Options for createServerToolsFilter.

## Properties

### excludeTools?

> `optional` **excludeTools**: `Iterable`<`string`, `any`, `any`>

Defined in: [src/lib/tools/serverTools.ts:1007](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1007)

Tool names to always drop from results, even when they match.

***

### matchOptions?

> `optional` **matchOptions**: [`ToolMatchOptions`](ToolMatchOptions.md)

Defined in: [src/lib/tools/serverTools.ts:1009](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1009)

Options forwarded to `findMatchingTools`.

***

### toolSets?

> `optional` **toolSets**: [`ToolSet`](ToolSet.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1005](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1005)

Tool sets to expand additively. When any anchor scores at or above the
set's `anchorMinSimilarity`, all members are included alongside the
original semantic matches.
