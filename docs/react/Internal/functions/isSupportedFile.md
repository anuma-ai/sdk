# isSupportedFile

> **isSupportedFile**(`file`: [`FileTypeQuery`](../interfaces/FileTypeQuery.md)): `boolean`

Defined in: [src/lib/processors/preprocessor.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/preprocessor.ts#69)

Test whether the SDK can extract text from the given file.

Use this for upload-time validation in drag-drop handlers, file-picker
onChange, or paste handlers — block at the boundary with a clear message
instead of silently accepting a file the model will never see.

Note: this covers files handled by the SDK's text extractors (PDF, Word,
Excel, Zip, plain text/markdown/JSON, etc.). Image files (`image/*`) are
sent directly as `image_url` content parts and are NOT handled by
processors — combine with an image check in your validation:

```ts
const ok = file.type.startsWith("image/") || isSupportedFile(file);
```

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

`file`

</td>
<td>

[`FileTypeQuery`](../interfaces/FileTypeQuery.md)

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
