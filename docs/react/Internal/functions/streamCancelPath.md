# streamCancelPath

> **streamCancelPath**(`inferenceId`: `string`): `string`

Defined in: [src/lib/chat/resumeStream.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#34)

Build the cancel path for a detached stream. A POST here tells the portal to
stop generating into the buffer and release it — the billing-safe teardown
for "the user pressed stop after we'd already detached".

Exported so client repos can mock the endpoint in E2E without string drift.

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

`inferenceId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`string`
