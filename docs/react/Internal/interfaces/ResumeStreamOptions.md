# ResumeStreamOptions

Defined in: [src/lib/chat/resumeStream.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#63)

Options for [resumeStream](../functions/resumeStream.md).

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/chat/resumeStream.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#73)

Base URL for the portal.

**Default**

```ts
the SDK's configured BASE_URL.
```

***

### handle

> **handle**: [`StreamResumeHandle`](../type-aliases/StreamResumeHandle.md)

Defined in: [src/lib/chat/resumeStream.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#65)

The handle captured from a detached `runToolLoop` result.

***

### idleTimeoutMs?

> `optional` **idleTimeoutMs**: `number`

Defined in: [src/lib/chat/resumeStream.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#93)

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

Defined in: [src/lib/chat/resumeStream.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#95)

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

Defined in: [src/lib/chat/resumeStream.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#101)

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

Defined in: [src/lib/chat/resumeStream.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#99)

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

Defined in: [src/lib/chat/resumeStream.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#97)

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

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chat/resumeStream.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#80)

Aborts the replay; the partial is returned as an interrupted result.

***

### smoothing?

> `optional` **smoothing**: `boolean` | `StreamSmoothingConfig`

Defined in: [src/lib/chat/resumeStream.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#82)

Adaptive output smoothing for the replayed content.

**Default**

```ts
true
```

***

### token

> **token**: `string`

Defined in: [src/lib/chat/resumeStream.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#71)

Fresh bearer token. The CALLER fetches it at resume time — a multi-minute
background gap expires the bearer, so a token captured when the original
stream started must never be reused (see `useChat.resumeStream`).

***

### transport?

> `optional` **transport**: `StreamingTransport`

Defined in: [src/lib/chat/resumeStream.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/resumeStream.ts#78)

Streaming transport. Defaults to the GET-capable fetch transport; Expo
passes `xhrTransport` (RN can't stream `fetch` bodies).
