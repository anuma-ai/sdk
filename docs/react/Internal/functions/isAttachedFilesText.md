# isAttachedFilesText

> **isAttachedFilesText**(`text`: `string` | `null` | `undefined`): `boolean`

Defined in: [src/lib/chat/fileContext.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/fileContext.ts#23)

True when a text part is the attachment-contents part built by [buildAttachedFilesText](buildAttachedFilesText.md).

Matches the whole generated shape — opening tag plus the fixed header line, and the closing
tag — not just the tag, so user text that merely starts with `<attached_files>` is still
treated as the user's prompt.

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

`text`

</td>
<td>

`string` | `null` | `undefined`

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
