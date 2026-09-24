# formatFileProcessingNotes

> **formatFileProcessingNotes**(`statuses`: [`FileProcessingStatus`](../interfaces/FileProcessingStatus.md)\[], `options`: `object`): `string` | `null`

Defined in: [src/lib/processors/fileStatusNotes.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/fileStatusNotes.ts#22)

One line per file the model did NOT get, saying why — e.g.
`[order.pdf could not be read: the file is larger than 10 MB]`.

Put these in the same `<attached_files>` part as the extracted contents so the model can tell
the user exactly which attachment it could not read instead of guessing ("an unreadable image
placeholder"). Returns null when every file was read.

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

`statuses`

</td>
<td>

[`FileProcessingStatus`](../interfaces/FileProcessingStatus.md)\[]

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.maxFileSizeBytes?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`string` | `null`
