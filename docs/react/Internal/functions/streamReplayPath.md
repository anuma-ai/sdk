# streamReplayPath

> **streamReplayPath**(`inferenceId`: `string`): `string`

Defined in: [src/lib/chat/resumeStream.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#23)

Build the replay path for a detached stream. The portal serves the buffered
stream from seq 0 on a GET to this path — no `starting_after`, no `id:`
cursor, no request body. Replay always starts from the first buffered byte
and the client rebuilds its own view with a fresh accumulator; partial
client state is never sent back to the server.

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
