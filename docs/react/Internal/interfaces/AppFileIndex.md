# AppFileIndex

Defined in: [src/lib/chatStore/appFiles.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#150)

## Methods

### list()

> **list**(`signal?`: `AbortSignal`): `Promise`<[`AppFile`](AppFile.md)\[]>

Defined in: [src/lib/chatStore/appFiles.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#152)

Every live file of every conversation, fetching only what changed since the last call.

**Parameters**

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

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`AppFile`](AppFile.md)\[]>
