# getSupportedFileTypes

> **getSupportedFileTypes**(): `object`

Defined in: [src/lib/processors/preprocessor.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/preprocessor.ts#81)

Get the union of all MIME types and extensions handled by the SDK's
default processors. Useful for building an `<input type="file" accept>`
allowlist.

Note: does NOT include image MIME types — add `"image/*"` yourself if you
want the file picker to also accept images. See `isSupportedFile` docs.

## Returns

`object`

### extensions

> **extensions**: `string`\[]

### mimeTypes

> **mimeTypes**: `string`\[]
