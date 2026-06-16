# expandToolSetsAdditive

> **expandToolSetsAdditive**(`matchedNames`: `Set`<`string`>, `availableNames`: `Set`<`string`>, `scores`: `Map`<`string`, `number`>, `toolSets`: [`ToolSet`](../interfaces/ToolSet.md)\[], `activeSetNames?`: `ReadonlySet`<`string`>): `Set`<`string`>

Defined in: [src/lib/tools/serverTools.ts:1039](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1039)

Additively expand tool sets: when any anchor of a set scores at or above
its `anchorMinSimilarity`, all set members are added to the result.
Original matches are preserved; multiple sets can expand independently.

Members of sets that *don't* activate are kept if they were individually
matched. We deliberately don't strip orphans: the cost of a single
borderline tool slipping into the request is cheap (a few extra bytes,
no behavioral impact) but stripping legitimate matches like
`create_file 0.55` on prompts where `patch_file` doesn't also clear the
anchor threshold would silently break app-creation flows. Recall over
precision.

Use this for server-side toolkit suites where the LLM needs the full
call chain (e.g. fal\_list\_models → fal\_model\_schema → fal\_queue\_submit →
fal\_queue\_status → fal\_queue\_result). Differs from `applyToolSets`, which
replaces non-set matches when a set activates.

To express "any member triggers the set" (not specific anchors), pass
`anchors: members` when defining the ToolSet.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`matchedNames`

</td>
<td>

`Set`<`string`>

</td>
<td>

Names selected by semantic matching

</td>
</tr>
<tr>
<td>

`availableNames`

</td>
<td>

`Set`<`string`>

</td>
<td>

All tool names available for selection

</td>
</tr>
<tr>
<td>

`scores`

</td>
<td>

`Map`<`string`, `number`>

</td>
<td>

Map of tool name → similarity score

</td>
</tr>
<tr>
<td>

`toolSets`

</td>
<td>

[`ToolSet`](../interfaces/ToolSet.md)\[]

</td>
<td>

Tool sets to evaluate

</td>
</tr>
<tr>
<td>

`activeSetNames?`

</td>
<td>

`ReadonlySet`<`string`>

</td>
<td>

Set names that should expand unconditionally,
bypassing the anchor-similarity check. Use this when conversation state
implies a set should be present regardless of how the current prompt is
phrased (e.g., a slide deck artifact already exists in the conversation).

</td>
</tr>
</tbody>
</table>

## Returns

`Set`<`string`>

Set including original matches plus members of any activated set
