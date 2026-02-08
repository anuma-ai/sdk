# useSTT

> **useSTT**(`options?`: [`UseSTTOptions`](../Internal/type-aliases/UseSTTOptions.md)): [`UseSTTResult`](../Internal/type-aliases/UseSTTResult.md)

Defined in: [src/react/useSTT.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSTT.ts#L48)

A React hook for real-time speech-to-text via WebSocket streaming.

Captures microphone audio, converts it to PCM, streams it over WebSocket
to the Portal, and provides real-time transcript updates.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options?`

</td>
<td>

[`UseSTTOptions`](../Internal/type-aliases/UseSTTOptions.md)

</td>
<td>

Configuration object

</td>
</tr>
</tbody>
</table>

## Returns

[`UseSTTResult`](../Internal/type-aliases/UseSTTResult.md)

## Example

```tsx
const { isRecording, transcript, startRecording, stopRecording, audioLevel } = useSTT({
  getToken: async () => getAuthToken(),
  onTranscript: (text) => setInput(text),
  onFinish: (finalText) => handleSubmit(finalText),
});
```
