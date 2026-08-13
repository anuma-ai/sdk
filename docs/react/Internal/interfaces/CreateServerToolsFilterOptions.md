# CreateServerToolsFilterOptions

Defined in: [src/lib/tools/serverTools.ts:1447](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1447)

Options for createServerToolsFilter.

## Properties

### excludeTools?

> `optional` **excludeTools**: `Iterable`<`string`, `any`, `any`>

Defined in: [src/lib/tools/serverTools.ts:1455](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1455)

Tool names to always drop from results, even when they match.

***

### matchOptions?

> `optional` **matchOptions**: [`ToolMatchOptions`](ToolMatchOptions.md)

Defined in: [src/lib/tools/serverTools.ts:1457](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1457)

Options forwarded to `findMatchingTools`.

***

### toolSets?

> `optional` **toolSets**: [`ToolSet`](ToolSet.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1453](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1453)

Tool sets to expand additively. When any anchor scores at or above the
set's `anchorMinSimilarity`, all members are included alongside the
original semantic matches.
