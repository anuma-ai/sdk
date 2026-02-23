# UseVoiceResult

Defined in: [src/react/useVoice.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L85)

Result returned by the useVoice hook.

## Properties

### abortNativeTranscription()

> **abortNativeTranscription**: () => `void`

Defined in: [src/react/useVoice.ts:117](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L117)

Abort on-device speech recognition without returning a result.

**Returns**

`void`

***

### disposeModel()

> **disposeModel**: () => `Promise`<`void`>

Defined in: [src/react/useVoice.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L99)

Dispose the loaded model to free WASM memory. Useful on memory-constrained devices (mobile).

**Returns**

`Promise`<`void`>

***

### error

> **error**: `Error` | `null`

Defined in: [src/react/useVoice.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L109)

Error from the last operation

***

### isLoadingModel

> **isLoadingModel**: `boolean`

Defined in: [src/react/useVoice.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L103)

Whether the Whisper model is currently loading/downloading

***

### isModelLoaded

> **isModelLoaded**: `boolean`

Defined in: [src/react/useVoice.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L101)

Whether the Whisper model has been loaded

***

### isNativeListening

> **isNativeListening**: `boolean`

Defined in: [src/react/useVoice.ts:119](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L119)

Whether on-device speech recognition is currently listening.

***

### isRecording

> **isRecording**: `boolean`

Defined in: [src/react/useVoice.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L87)

Whether the microphone is currently recording

***

### isTranscribing

> **isTranscribing**: `boolean`

Defined in: [src/react/useVoice.ts:93](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L93)

Whether transcription is in progress

***

### nativeSpeechAvailable

> **nativeSpeechAvailable**: `boolean`

Defined in: [src/react/useVoice.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L111)

Whether on-device speech recognition is available (iOS Safari). No audio leaves the device.

***

### preloadModel()

> **preloadModel**: () => `Promise`<`void`>

Defined in: [src/react/useVoice.ts:97](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L97)

Preload the Whisper model so transcription starts instantly later

**Returns**

`Promise`<`void`>

***

### recording

> **recording**: [`VoiceRecording`](../Internal/interfaces/VoiceRecording.md) | `null`

Defined in: [src/react/useVoice.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L105)

The last recording

***

### startNativeTranscription()

> **startNativeTranscription**: () => `void`

Defined in: [src/react/useVoice.ts:113](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L113)

Start on-device speech recognition. Call stopNativeTranscription() to get the result.

**Returns**

`void`

***

### startRecording()

> **startRecording**: () => `Promise`<`void`>

Defined in: [src/react/useVoice.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L89)

Start recording from the microphone

**Returns**

`Promise`<`void`>

***

### stopNativeTranscription()

> **stopNativeTranscription**: () => `Promise`<[`TranscriptionResult`](../Internal/interfaces/TranscriptionResult.md)>

Defined in: [src/react/useVoice.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L115)

Stop on-device speech recognition and return the accumulated text.

**Returns**

`Promise`<[`TranscriptionResult`](../Internal/interfaces/TranscriptionResult.md)>

***

### stopRecording()

> **stopRecording**: () => `Promise`<[`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)>

Defined in: [src/react/useVoice.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L91)

Stop recording and return the audio

**Returns**

`Promise`<[`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)>

***

### transcribe()

> **transcribe**: (`recording?`: [`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)) => `Promise`<[`TranscriptionResult`](../Internal/interfaces/TranscriptionResult.md)>

Defined in: [src/react/useVoice.ts:95](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L95)

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

Defined in: [src/react/useVoice.ts:107](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L107)

The last transcription result
