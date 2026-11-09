# ResumeStreamOptions

Defined in: [src/lib/chat/resumeStream.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#121)

Options for [resumeStream](../functions/resumeStream.md).

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/chat/resumeStream.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#131)

Base URL for the portal.

**Default**

```ts
the SDK's configured BASE_URL.
```

***

### finishedToolNames?

> `optional` **finishedToolNames**: `string`\[]

Defined in: [src/lib/chat/resumeStream.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#163)

Tools a finished replay may end on because the device runs them when the answer is stored.

***

### handle

> **handle**: [`StreamResumeHandle`](../type-aliases/StreamResumeHandle.md)

Defined in: [src/lib/chat/resumeStream.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#123)

The handle captured from a detached `runToolLoop` result.

***

### idleTimeoutMs?

> `optional` **idleTimeoutMs**: `number`

Defined in: [src/lib/chat/resumeStream.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#151)

Client-side watchdog for a dead live-tail.

**Default**

120\_000ms.

Deliberately NOT ~30s: the portal tolerates >100s reasoning silences (no
`data:` frames on the replay connection during them) and its own liveness
rule (heartbeat stale >90s => SSE error + `[DONE]`) is the authoritative
guard. This client timer is a backstop for a half-open TCP connection and
must sit ABOVE the server's 90s rule so the server error always wins when
the portal is reachable. Set to 0 / Infinity to disable.

***

### onData()?

> `optional` **onData**: (`chunk`: `string`) => `void`

Defined in: [src/lib/chat/resumeStream.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#153)

Content text deltas as they replay (always from seq 0 — reset accumulated text first).

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

`chunk`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/lib/chat/resumeStream.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#161)

Called on a transient/unexpected failure. Never called for 410 (throws) nor interrupted terminals.

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

`error`

</td>
<td>

`Error`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onFinish()?

> `optional` **onFinish**: (`response`: `ApiResponse`) => `void`

Defined in: [src/lib/chat/resumeStream.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#159)

Called once on a clean completion. Never called for 410 nor interrupted terminals.

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

`response`

</td>
<td>

`ApiResponse`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onThinking()?

> `optional` **onThinking**: (`chunk`: `string`) => `void`

Defined in: [src/lib/chat/resumeStream.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#155)

Thinking/reasoning deltas as they replay.

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

`chunk`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### piiRedactor?

> `optional` **piiRedactor**: [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/chat/resumeStream.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#157)

Restores the placeholders this redactor assigned when the original request was sent.

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chat/resumeStream.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#138)

Aborts the replay; the partial is returned as an interrupted result.

***

### smoothing?

> `optional` **smoothing**: `boolean` | [`StreamSmoothingConfig`](../type-aliases/StreamSmoothingConfig.md)

Defined in: [src/lib/chat/resumeStream.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#140)

Adaptive output smoothing for the replayed content.

**Default**

```ts
true
```

***

### token

> **token**: `string`

Defined in: [src/lib/chat/resumeStream.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#129)

Fresh bearer token. The CALLER fetches it at resume time — a multi-minute
background gap expires the bearer, so a token captured when the original
stream started must never be reused (see `useChat.resumeStream`).

***

### transport?

> `optional` **transport**: `StreamingTransport`

Defined in: [src/lib/chat/resumeStream.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#136)

Streaming transport. Defaults to the GET-capable fetch transport; Expo
passes `xhrTransport` (RN can't stream `fetch` bodies).
