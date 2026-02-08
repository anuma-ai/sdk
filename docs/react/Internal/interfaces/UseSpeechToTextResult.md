# UseSpeechToTextResult

Defined in: [src/lib/speechToText/types.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L31)

Return value of the useSpeechToText hook

## Properties

### audioLevel

> **audioLevel**: `number`

Defined in: [src/lib/speechToText/types.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L41)

Current audio input level (0–1), useful for waveform visualizations

***

### elapsedTime

> **elapsedTime**: `number`

Defined in: [src/lib/speechToText/types.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L43)

Seconds elapsed since recording started

***

### error

> **error**: `string` | `null`

Defined in: [src/lib/speechToText/types.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L51)

Current error message, or null

***

### isModelLoading

> **isModelLoading**: `boolean`

Defined in: [src/lib/speechToText/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L37)

Whether the Whisper model is being downloaded/loaded

***

### isRecording

> **isRecording**: `boolean`

Defined in: [src/lib/speechToText/types.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L33)

Whether the microphone is actively recording

***

### isSupported

> **isSupported**: `boolean`

Defined in: [src/lib/speechToText/types.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L53)

Whether the browser supports MediaRecorder and AudioContext

***

### isTranscribing

> **isTranscribing**: `boolean`

Defined in: [src/lib/speechToText/types.ts:35](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L35)

Whether audio is being transcribed by the worker

***

### modelProgress

> **modelProgress**: `number`

Defined in: [src/lib/speechToText/types.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L39)

Model download progress (0–100)

***

### startRecording()

> **startRecording**: () => `Promise`<`void`>

Defined in: [src/lib/speechToText/types.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L45)

Start recording from the microphone

**Returns**

`Promise`<`void`>

***

### stopRecording()

> **stopRecording**: () => `void`

Defined in: [src/lib/speechToText/types.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L47)

Stop the current recording and begin transcription

**Returns**

`void`

***

### toggleRecording()

> **toggleRecording**: () => `void`

Defined in: [src/lib/speechToText/types.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/speechToText/types.ts#L49)

Toggle recording on/off

**Returns**

`void`
