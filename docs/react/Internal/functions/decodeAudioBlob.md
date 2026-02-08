# decodeAudioBlob

> **decodeAudioBlob**(`blob`: `Blob`): `Promise`<`Float32Array`<`ArrayBufferLike`>>

Defined in: [src/lib/speechToText/audio.ts:10](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/audio.ts#L10)

Decode a MediaRecorder Blob into a 16kHz mono Float32Array suitable for Whisper.
Uses OfflineAudioContext to resample to the target sample rate.

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

`blob`

</td>
<td>

`Blob`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`Float32Array`<`ArrayBufferLike`>>
