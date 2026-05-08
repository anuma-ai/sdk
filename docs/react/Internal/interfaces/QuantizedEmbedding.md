# QuantizedEmbedding

Defined in: [src/lib/memoryEngine/quantization.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/quantization.ts#32)

Result of quantizing a Float32 / number\[] embedding to Int8.

`data` holds the quantized values in \[-127, 127].
`scale` is the per-vector Float32 scaling factor; multiplying a
dequantized Int8 value by `scale / 127` recovers the original.

The Int8Array does not own a separate ArrayBuffer copy beyond the
one allocated here, and is plain transferable storage.

## Properties

### data

> **data**: `Int8Array`

Defined in: [src/lib/memoryEngine/quantization.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/quantization.ts#33)

***

### scale

> **scale**: `number`

Defined in: [src/lib/memoryEngine/quantization.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/quantization.ts#34)
