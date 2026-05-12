# dequantizeEmbedding

> **dequantizeEmbedding**(`__namedParameters`: [`QuantizedEmbedding`](../interfaces/QuantizedEmbedding.md)): `Float32Array`

Defined in: [src/lib/memoryEngine/quantization.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/quantization.ts#89)

Dequantize an Int8 embedding back into Float32.

Inverse of [quantizeEmbedding](quantizeEmbedding.md) up to ~1/127 quantization error.

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

`__namedParameters`

</td>
<td>

[`QuantizedEmbedding`](../interfaces/QuantizedEmbedding.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Float32Array`
