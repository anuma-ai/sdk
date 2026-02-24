# chunkText

> **chunkText**(`text`: `string`, `options?`: [`ChunkingOptions`](../interfaces/ChunkingOptions.md)): [`TextChunk`](../interfaces/TextChunk.md)\[]

Defined in: [src/lib/memoryRetrieval/chunking.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryRetrieval/chunking.ts#L68)

Split text into overlapping chunks using sentence boundaries.

Algorithm:

1. Split text into sentences
2. Accumulate sentences until chunk size is reached
3. Create chunk with overlap from previous chunk
4. Handle edge cases (very long sentences, short texts)

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

`text`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`ChunkingOptions`](../interfaces/ChunkingOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`TextChunk`](../interfaces/TextChunk.md)\[]
