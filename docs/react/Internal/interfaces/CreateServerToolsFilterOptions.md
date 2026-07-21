# CreateServerToolsFilterOptions

Defined in: [src/lib/tools/serverTools.ts:1350](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1350)

Options for createServerToolsFilter.

## Properties

### excludeTools?

> `optional` **excludeTools**: `Iterable`<`string`, `any`, `any`>

Defined in: [src/lib/tools/serverTools.ts:1358](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1358)

Tool names to always drop from results, even when they match.

***

### matchOptions?

> `optional` **matchOptions**: [`ToolMatchOptions`](ToolMatchOptions.md)

Defined in: [src/lib/tools/serverTools.ts:1360](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1360)

Options forwarded to `findMatchingTools`.

***

### toolSets?

> `optional` **toolSets**: [`ToolSet`](ToolSet.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1356](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1356)

Tool sets to expand additively. When any anchor scores at or above the
set's `anchorMinSimilarity`, all members are included alongside the
original semantic matches.
