# useSpeechToText

> **useSpeechToText**(`options`: [`UseSpeechToTextOptions`](../Internal/interfaces/UseSpeechToTextOptions.md)): [`UseSpeechToTextResult`](../Internal/interfaces/UseSpeechToTextResult.md)

Defined in: [src/react/useSpeechToText.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSpeechToText.ts#L31)

React hook for on-device speech-to-text using Whisper via a Web Worker.

Audio never leaves the browser — recording is captured via MediaRecorder,
decoded to 16kHz mono, and sent to a Web Worker running Transformers.js Whisper.

The consumer provides a `createWorker` factory because bundlers (webpack/vite/turbopack)
need to resolve worker entry points at build time.

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

`options`

</td>
<td>

[`UseSpeechToTextOptions`](../Internal/interfaces/UseSpeechToTextOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`UseSpeechToTextResult`](../Internal/interfaces/UseSpeechToTextResult.md)

## Example

```tsx
const stt = useSpeechToText({
  createWorker: () => new Worker(new URL('../workers/whisper.worker.ts', import.meta.url)),
  onTranscript: (text) => setPrompt(text),
});
```
