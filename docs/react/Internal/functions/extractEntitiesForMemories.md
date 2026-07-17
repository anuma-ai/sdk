# extractEntitiesForMemories

> **extractEntitiesForMemories**(`memories`: readonly [`TopicExtractionInput`](../interfaces/TopicExtractionInput.md)\[], `options`: [`TopicExtractOptions`](../interfaces/TopicExtractOptions.md)): `Promise`<`Map`<`string`, [`ExtractedEntity`](../interfaces/ExtractedEntity.md)\[]>>

Defined in: [src/lib/memory/topicExtract.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#103)

Ask the extraction LLM for the named entities of each memory, in batches of
[TOPIC\_EXTRACTION\_BATCH\_SIZE](../variables/TOPIC_EXTRACTION_BATCH_SIZE.md). Pure LLM step — no persistence.

Returns memoryId → entities. A memory PRESENT with an empty array is a
successful, explicit "no named entities" answer; a memory ABSENT from the
map is UNANSWERED — its batch failed after retries, returned an unusable
shape, or the model omitted its id. Callers must retry absent ids in a
later sweep, never stamp them.

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
