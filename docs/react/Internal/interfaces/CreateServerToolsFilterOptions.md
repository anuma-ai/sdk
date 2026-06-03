# CreateServerToolsFilterOptions

Defined in: [src/lib/tools/serverTools.ts:1051](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1051)

Options for createServerToolsFilter.

## Properties

### excludeTools?

> `optional` **excludeTools**: `Iterable`<`string`, `any`, `any`>

Defined in: [src/lib/tools/serverTools.ts:1059](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1059)

Tool names to always drop from results, even when they match.

***

### matchOptions?

> `optional` **matchOptions**: [`ToolMatchOptions`](ToolMatchOptions.md)

Defined in: [src/lib/tools/serverTools.ts:1061](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1061)

Options forwarded to `findMatchingTools`.

***

### toolSets?

> `optional` **toolSets**: [`ToolSet`](ToolSet.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1057](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1057)

Tool sets to expand additively. When any anchor scores at or above the
set's `anchorMinSimilarity`, all members are included alongside the
original semantic matches.
