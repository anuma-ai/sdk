# parseJsx

> **parseJsx**(`source`: `string`, `options?`: `object`): [`AnumaNode`](../interfaces/AnumaNode.md)

Defined in: [src/tools/slides/jsx.ts:532](https://github.com/anuma-ai/sdk/blob/main/src/tools/slides/jsx.ts#532)

Parse a JSX source string into an AnumaNode tree.

`strict` mode (opt-in, defaults to `false`) enables checks that catch
model-emitted JSX with the wrong convention before it lands in the deck:
top-level visual-styling props on text elements (which the renderer
silently ignores → invisible output). Stored decks load with strict off
— any deck previously built before the strict check existed might carry
non-conforming JSX, and we don't want a tightened validator to retro-
actively break every tool call on that deck. Callers that parse
model-submitted JSX (`add_slide`, `insert_slide`, `replace_slide`,
`replace_element`, `insert_element`) pass `strict: true`.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`source`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.strict?`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

## Returns

[`AnumaNode`](../interfaces/AnumaNode.md)
