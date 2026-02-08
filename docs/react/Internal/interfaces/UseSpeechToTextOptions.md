# UseSpeechToTextOptions

Defined in: [src/lib/speechToText/types.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L19)

Options for the useSpeechToText hook

## Properties

### createWorker()

> **createWorker**: () => `Worker`

Defined in: [src/lib/speechToText/types.ts:21](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L21)

Factory that creates the Web Worker. Consumer provides this because bundlers need to resolve worker entry points at build time.

**Returns**

`Worker`

***

### maxDurationSeconds?

> `optional` **maxDurationSeconds**: `number`

Defined in: [src/lib/speechToText/types.ts:23](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L23)

Maximum recording duration in seconds. Default: 180

***

### onError()?

> `optional` **onError**: (`error`: `string`) => `void`

Defined in: [src/lib/speechToText/types.ts:27](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L27)

Called when an error occurs

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

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onTranscript()?

> `optional` **onTranscript**: (`text`: `string`) => `void`

Defined in: [src/lib/speechToText/types.ts:25](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L25)

Called when transcription completes successfully

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

`text`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
