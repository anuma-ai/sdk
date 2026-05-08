# quantizeEmbedding

> **quantizeEmbedding**(`v`: `number`\[] | `Float32Array`<`ArrayBufferLike`>): [`QuantizedEmbedding`](../interfaces/QuantizedEmbedding.md)

Defined in: [src/lib/memoryEngine/quantization.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/quantization.ts#53)

Quantize a Float32 embedding (or number\[]) into an Int8 vector + scale.

The scale is the maximum absolute value across the input; all other
values are mapped linearly into \[-127, 127] and rounded. A zero vector
yields a zero Int8Array and a scale of 0.

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

`v`

</td>
<td>

`number`\[] | `Float32Array`<`ArrayBufferLike`>

</td>
<td>

The embedding to quantize. Either a Float32Array (typical for
on-device caches) or a plain number\[] (typical for values fresh out of
`JSON.parse`). Plain numbers are read directly without copying into a
Float32Array first.

</td>
</tr>
</tbody>
</table>

## Returns

[`QuantizedEmbedding`](../interfaces/QuantizedEmbedding.md)

The quantized data + scale. The returned `data.length === v.length`.
