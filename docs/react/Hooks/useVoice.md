# useVoice

> **useVoice**(`options?`: [`UseVoiceOptions`](UseVoiceOptions.md)): [`UseVoiceResult`](UseVoiceResult.md)

Defined in: [src/react/useVoice.ts:201](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L201)

React hook for recording voice and transcribing it on-device using Whisper.

Transcription runs entirely in the browser via `@huggingface/transformers`
(ONNX Runtime + WebAssembly). The Whisper model (~40 MB for tiny) is
downloaded on first use and cached by the browser.

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

`options?`

</td>
<td>

[`UseVoiceOptions`](UseVoiceOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`UseVoiceResult`](UseVoiceResult.md)

## Example

```tsx
const { startRecording, stopRecording, transcribe } = useVoice();

const handleStop = async () => {
  const recording = await stopRecording();
  const { text } = await transcribe(recording);
  // Send text to LLM via useChat
};
```
