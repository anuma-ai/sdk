# shouldRecallMemory

> **shouldRecallMemory**(`query`: `string`): `boolean`

Defined in: [src/lib/memory/context.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#45)

Only skip confidently trivial utterances. Word counts reject useful short
queries and languages whose writing does not separate words with spaces.

The stoplist is an exact-match allowance for greetings and acknowledgments,
not a language model: anything not listed still recalls, so a missing
language costs a wasted lookup, never a missed memory. Kept to the handful of
forms that cannot carry a fact in the languages the app ships in.

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

`query`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
