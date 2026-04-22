# ProcessorRegistry

Defined in: [src/lib/processors/registry.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#16)

Registry for managing and finding file processors

## Constructors

### Constructor

> **new ProcessorRegistry**(): `ProcessorRegistry`

**Returns**

`ProcessorRegistry`

## Methods

### findProcessor()

> **findProcessor**(`file`: [`FileTypeQuery`](../interfaces/FileTypeQuery.md)): [`FileProcessor`](../interfaces/FileProcessor.md) | `null`

Defined in: [src/lib/processors/registry.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#31)

Find a processor that can handle the given file

**Parameters**

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

`file`

</td>
<td>

[`FileTypeQuery`](../interfaces/FileTypeQuery.md)

</td>
<td>

File metadata to match

</td>
</tr>
</tbody>
</table>

**Returns**

[`FileProcessor`](../interfaces/FileProcessor.md) | `null`

The matching processor, or null if none found

***

### getAll()

> **getAll**(): [`FileProcessor`](../interfaces/FileProcessor.md)\[]

Defined in: [src/lib/processors/registry.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#97)

Get all registered processors

**Returns**

[`FileProcessor`](../interfaces/FileProcessor.md)\[]

***

### getSupportedExtensions()

> **getSupportedExtensions**(): `string`\[]

Defined in: [src/lib/processors/registry.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#84)

Get the union of all file extensions handled by registered processors.
Includes the leading dot (e.g. `.md`, `.pdf`) so values can be passed
directly to an `<input accept>` attribute.
Result is deduplicated and sorted for stable output.

**Returns**

`string`\[]

***

### getSupportedMimeTypes()

> **getSupportedMimeTypes**(): `string`\[]

Defined in: [src/lib/processors/registry.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#68)

Get the union of all MIME types handled by registered processors.
Useful for building an `<input type="file" accept="...">` allowlist.
Result is deduplicated and sorted for stable output.

**Returns**

`string`\[]

***

### isSupported()

> **isSupported**(`file`: [`FileTypeQuery`](../interfaces/FileTypeQuery.md)): `boolean`

Defined in: [src/lib/processors/registry.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#59)

Test whether any registered processor can handle the given file.
Convenience wrapper around `findProcessor` for upload-time validation
where you only care about the boolean answer.

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

`file`

</td>
<td>

[`FileTypeQuery`](../interfaces/FileTypeQuery.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`boolean`

***

### register()

> **register**(`processor`: [`FileProcessor`](../interfaces/FileProcessor.md)): `void`

Defined in: [src/lib/processors/registry.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#22)

Register a processor

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

`processor`

</td>
<td>

[`FileProcessor`](../interfaces/FileProcessor.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
