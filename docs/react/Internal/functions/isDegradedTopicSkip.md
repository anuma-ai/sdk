# isDegradedTopicSkip

> **isDegradedTopicSkip**(`reason`: [`TopicSkipReason`](../type-aliases/TopicSkipReason.md)): `boolean`

Defined in: [src/lib/memory/topicExtract.ts:352](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#352)

Whether a skip reason means the sweep FAILED on that row, rather than
deliberately passing over it.

Exported so callers classify identically instead of each re-deriving the
split — the reason this type exists is that one wrong grouping turns a broken
sweep back into a healthy-looking one.

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

`reason`

</td>
<td>

[`TopicSkipReason`](../type-aliases/TopicSkipReason.md)

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
