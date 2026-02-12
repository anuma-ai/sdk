# UseVoiceOptions

Defined in: [src/react/useVoice.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L57)

Options for the useVoice hook.

## Properties

### language?

> `optional` **language**: `string`

Defined in: [src/react/useVoice.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L73)

Language code for transcription (e.g. "en", "es", "fr").
If omitted, Whisper auto-detects the language.

***

### model?

> `optional` **model**: [`WhisperModel`](../Internal/type-aliases/WhisperModel.md)

Defined in: [src/react/useVoice.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L68)

Whisper model to use for transcription.
Larger models are more accurate but slower to download and run.

* `whisper-tiny`: ~40 MB, fastest
* `whisper-base`: ~75 MB, balanced
* `whisper-small`: ~250 MB, most accurate

Append `.en` for English-only variants (slightly faster).

**Default**

```ts
"whisper-tiny"
```

***

### onModelProgress()?

> `optional` **onModelProgress**: (`progress`: [`ModelLoadProgress`](../Internal/interfaces/ModelLoadProgress.md)) => `void`

Defined in: [src/react/useVoice.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useVoice.ts#L78)

Called during model download with progress updates.
Useful for showing a download progress bar on first use.

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

`progress`

</td>
<td>

[`ModelLoadProgress`](../Internal/interfaces/ModelLoadProgress.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
