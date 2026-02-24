# ProcessorRegistry

Defined in: [src/lib/processors/registry.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#L7)

Registry for managing and finding file processors

## Constructors

### Constructor

> **new ProcessorRegistry**(): `ProcessorRegistry`

**Returns**

`ProcessorRegistry`

## Methods

### findProcessor()

> **findProcessor**(`file`: [`FileMetadata`](../interfaces/FileMetadata.md)): [`FileProcessor`](../interfaces/FileProcessor.md) | `null`

Defined in: [src/lib/processors/registry.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#L22)

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

[`FileMetadata`](../interfaces/FileMetadata.md)

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

Defined in: [src/lib/processors/registry.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#L48)

Get all registered processors

**Returns**

[`FileProcessor`](../interfaces/FileProcessor.md)\[]

***

### register()

> **register**(`processor`: [`FileProcessor`](../interfaces/FileProcessor.md)): `void`

Defined in: [src/lib/processors/registry.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#L13)

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
