# UseVoiceResult

Defined in: [src/react/useVoice.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L43)

Result returned by the useVoice hook.

## Properties

### error

> **error**: `Error` | `null`

Defined in: [src/react/useVoice.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L63)

Error from the last operation

***

### isLoadingModel

> **isLoadingModel**: `boolean`

Defined in: [src/react/useVoice.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L57)

Whether the Whisper model is currently loading/downloading

***

### isModelLoaded

> **isModelLoaded**: `boolean`

Defined in: [src/react/useVoice.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L55)

Whether the Whisper model has been loaded

***

### isRecording

> **isRecording**: `boolean`

Defined in: [src/react/useVoice.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L45)

Whether the microphone is currently recording

***

### isTranscribing

> **isTranscribing**: `boolean`

Defined in: [src/react/useVoice.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L51)

Whether transcription is in progress

***

### recording

> **recording**: [`VoiceRecording`](../Internal/interfaces/VoiceRecording.md) | `null`

Defined in: [src/react/useVoice.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L59)

The last recording

***

### startRecording()

> **startRecording**: () => `Promise`<`void`>

Defined in: [src/react/useVoice.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L47)

Start recording from the microphone

**Returns**

`Promise`<`void`>

***

### stopRecording()

> **stopRecording**: () => `Promise`<[`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)>

Defined in: [src/react/useVoice.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L49)

Stop recording and return the audio

**Returns**

`Promise`<[`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)>

***

### transcribe()

> **transcribe**: (`recording?`: [`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)) => `Promise`<[`TranscriptionResult`](../Internal/interfaces/TranscriptionResult.md)>

Defined in: [src/react/useVoice.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L53)

Transcribe a recording. Uses the last recording if none provided.

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

`recording?`

</td>
<td>

[`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`TranscriptionResult`](../Internal/interfaces/TranscriptionResult.md)>

***

### transcription

> **transcription**: [`TranscriptionResult`](../Internal/interfaces/TranscriptionResult.md) | `null`

Defined in: [src/react/useVoice.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L61)

The last transcription result
