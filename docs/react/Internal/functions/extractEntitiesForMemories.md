# extractEntitiesForMemories

> **extractEntitiesForMemories**(`memories`: readonly [`TopicExtractionInput`](../interfaces/TopicExtractionInput.md)\[], `options`: [`TopicExtractOptions`](../interfaces/TopicExtractOptions.md)): `Promise`<`Map`<`string`, [`ExtractedEntity`](../interfaces/ExtractedEntity.md)\[]>>

Defined in: [src/lib/memory/topicExtract.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#102)

Ask the extraction LLM for the named entities of each memory, in batches of
[TOPIC\_EXTRACTION\_BATCH\_SIZE](../variables/TOPIC_EXTRACTION_BATCH_SIZE.md). Pure LLM step — no persistence.

Returns memoryId → entities. A memory PRESENT with an empty array is a
successful "no named entities" result; a memory ABSENT from the map was in
a batch whose LLM call failed after retries (caller should retry it in a
later sweep, not stamp it).

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

`memories`

</td>
<td>

readonly [`TopicExtractionInput`](../interfaces/TopicExtractionInput.md)\[]

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`TopicExtractOptions`](../interfaces/TopicExtractOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`Map`<`string`, [`ExtractedEntity`](../interfaces/ExtractedEntity.md)\[]>>
