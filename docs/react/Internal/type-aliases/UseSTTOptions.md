# UseSTTOptions

> **UseSTTOptions** = `object`

Defined in: [src/lib/stt/types.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L49)

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/stt/types.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L51)

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/stt/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L50)

**Returns**

`Promise`<`string` | `null`>

***

### language?

> `optional` **language**: `string`

Defined in: [src/lib/stt/types.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L52)

***

### maxDurationSeconds?

> `optional` **maxDurationSeconds**: `number`

Defined in: [src/lib/stt/types.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L54)

***

### mode?

> `optional` **mode**: [`RecordingMode`](RecordingMode.md)

Defined in: [src/lib/stt/types.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L53)

***

### onError()?

> `optional` **onError**: (`error`: [`STTError`](STTError.md)) => `void`

Defined in: [src/lib/stt/types.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L56)

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

[`STTError`](STTError.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onFinish()?

> `optional` **onFinish**: (`finalTranscript`: `string`) => `void`

Defined in: [src/lib/stt/types.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L57)

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

`finalTranscript`

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

### onStart()?

> `optional` **onStart**: () => `void`

Defined in: [src/lib/stt/types.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L58)

**Returns**

`void`

***

### onTranscript()?

> `optional` **onTranscript**: (`transcript`: `string`, `segments`: [`TranscriptionSegment`](TranscriptionSegment.md)\[]) => `void`

Defined in: [src/lib/stt/types.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/stt/types.ts#L55)

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

`transcript`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`segments`

</td>
<td>

[`TranscriptionSegment`](TranscriptionSegment.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
