# resumeStream

> **resumeStream**(`options`: [`ResumeStreamOptions`](../interfaces/ResumeStreamOptions.md)): `Promise`<[`ResumeStreamResult`](../type-aliases/ResumeStreamResult.md)>

Defined in: [src/lib/chat/resumeStream.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#163)

Replay a detached stream from the portal's buffer.

This is the reconnect primitive: after `runToolLoop` returns the detached
variant with a [StreamResumeHandle](../type-aliases/StreamResumeHandle.md), `resumeStream` issues a GET to the
portal's replay endpoint and rebuilds the response from seq 0 using a FRESH
accumulator and FRESH smoothers. Nothing from the original (detached) run is
reused — the completions strategy's reasoning-tag parser is stateful, so
replaying into reused state would double-count; replay-from-0 into fresh
state is the correctness mechanism, not just a simplification.

Contract highlights:

* **No `starting_after`, no `id:` cursor, no body.** The GET carries the
  inference id in the path only; replay is always whole-stream. (The server
  reserves `starting_after` but does NOT honor it — sending it would silently
  duplicate content.)
* **410 → throws [StreamExpiredError](../classes/StreamExpiredError.md).** No `onFinish`/`onError`.
* **In-stream error / tool-request terminal → `interrupted: true`.** Flushes
  both smoothers and returns the partial; no throw, no `onError`, no `onFinish`.
* **token resolved by the caller at resume time** so a refresh during the
  detach window is honored.

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

`options`

</td>
<td>

[`ResumeStreamOptions`](../interfaces/ResumeStreamOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ResumeStreamResult`](../type-aliases/ResumeStreamResult.md)>
