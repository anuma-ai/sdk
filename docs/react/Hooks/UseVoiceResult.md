# UseVoiceResult

Defined in: [src/react/useVoice.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#86)

Result returned by the useVoice hook.

## Properties

### abortNativeTranscription()

> **abortNativeTranscription**: () => `void`

Defined in: [src/react/useVoice.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#118)

Abort on-device speech recognition without returning a result.

**Returns**

`void`

***

### disposeModel()

> **disposeModel**: () => `Promise`<`void`>

Defined in: [src/react/useVoice.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#100)

Dispose the loaded model to free WASM memory. Useful on memory-constrained devices (mobile).

**Returns**

`Promise`<`void`>

***

### error

> **error**: `Error` | `null`

Defined in: [src/react/useVoice.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#110)

Error from the last operation

***

### isLoadingModel

> **isLoadingModel**: `boolean`

Defined in: [src/react/useVoice.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#104)

Whether the Whisper model is currently loading/downloading

***

### isModelLoaded

> **isModelLoaded**: `boolean`

Defined in: [src/react/useVoice.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#102)

Whether the Whisper model has been loaded

***

### isNativeListening

> **isNativeListening**: `boolean`

Defined in: [src/react/useVoice.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#120)

Whether on-device speech recognition is currently listening.

***

### isRecording

> **isRecording**: `boolean`

Defined in: [src/react/useVoice.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#88)

Whether the microphone is currently recording

***

### isTranscribing

> **isTranscribing**: `boolean`

Defined in: [src/react/useVoice.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#94)

Whether transcription is in progress

***

### nativeSpeechAvailable

> **nativeSpeechAvailable**: `boolean`

Defined in: [src/react/useVoice.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#112)

Whether on-device speech recognition is available (iOS Safari). No audio leaves the device.

***

### preloadModel()

> **preloadModel**: () => `Promise`<`void`>

Defined in: [src/react/useVoice.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#98)

Preload the Whisper model so transcription starts instantly later

**Returns**

`Promise`<`void`>

***

### recording

> **recording**: [`VoiceRecording`](../Internal/interfaces/VoiceRecording.md) | `null`

Defined in: [src/react/useVoice.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#106)

The last recording

***

### startNativeTranscription()

> **startNativeTranscription**: () => `void`

Defined in: [src/react/useVoice.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#114)

Start on-device speech recognition. Call stopNativeTranscription() to get the result.

**Returns**

`void`

***

### startRecording()

> **startRecording**: () => `Promise`<`void`>

Defined in: [src/react/useVoice.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#90)

Start recording from the microphone

**Returns**

`Promise`<`void`>

***

### stopNativeTranscription()

> **stopNativeTranscription**: () => `Promise`<[`TranscriptionResult`](../Internal/interfaces/TranscriptionResult.md)>

Defined in: [src/react/useVoice.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#116)

Stop on-device speech recognition and return the accumulated text.

**Returns**

`Promise`<[`TranscriptionResult`](../Internal/interfaces/TranscriptionResult.md)>

***

### stopRecording()

> **stopRecording**: () => `Promise`<[`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)>

Defined in: [src/react/useVoice.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#92)

Stop recording and return the audio

**Returns**

`Promise`<[`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)>

***

### transcribe()

> **transcribe**: (`recording?`: [`VoiceRecording`](../Internal/interfaces/VoiceRecording.md)) => `Promise`<[`TranscriptionResult`](../Internal/interfaces/TranscriptionResult.md)>

Defined in: [src/react/useVoice.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#96)

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

Defined in: [src/react/useVoice.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/react/useVoice.ts#108)

The last transcription result
