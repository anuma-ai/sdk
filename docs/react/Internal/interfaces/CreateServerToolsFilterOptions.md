# CreateServerToolsFilterOptions

Defined in: [src/lib/tools/serverTools.ts:1109](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1109)

Options for createServerToolsFilter.

## Properties

### excludeTools?

> `optional` **excludeTools**: `Iterable`<`string`, `any`, `any`>

Defined in: [src/lib/tools/serverTools.ts:1117](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1117)

Tool names to always drop from results, even when they match.

***

### matchOptions?

> `optional` **matchOptions**: [`ToolMatchOptions`](ToolMatchOptions.md)

Defined in: [src/lib/tools/serverTools.ts:1119](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1119)

Options forwarded to `findMatchingTools`.

***

### toolSets?

> `optional` **toolSets**: [`ToolSet`](ToolSet.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1115](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1115)

Tool sets to expand additively. When any anchor scores at or above the
set's `anchorMinSimilarity`, all members are included alongside the
original semantic matches.
