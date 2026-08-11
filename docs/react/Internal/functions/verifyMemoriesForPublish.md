# verifyMemoriesForPublish

> **verifyMemoriesForPublish**(`memories`: readonly [`MemoryToVerify`](../type-aliases/MemoryToVerify.md)\[], `sources`: [`VerificationSources`](../interfaces/VerificationSources.md), `options`: [`VerifyMemoriesForPublishOptions`](../interfaces/VerifyMemoriesForPublishOptions.md)): `Promise`<[`MemoryVerification`](../type-aliases/MemoryVerification.md)\[]>

Defined in: [src/lib/memory/verifySupport.ts:483](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#483)

Verify each memory against the messages it was extracted from, in input
order. Makes at most ONE portal call, and none at all when every memory can
be bucketed locally.

Writes nothing and publishes nothing — the caller reads the verdicts,
decides (per #707: flag the failures for user review, never delete), and
calls `setMemoryVisibilityOp` for whatever it goes on to publish.

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

readonly [`MemoryToVerify`](../type-aliases/MemoryToVerify.md)\[]

</td>
</tr>
<tr>
<td>

`sources`

</td>
<td>

[`VerificationSources`](../interfaces/VerificationSources.md)

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`VerifyMemoriesForPublishOptions`](../interfaces/VerifyMemoriesForPublishOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`MemoryVerification`](../type-aliases/MemoryVerification.md)\[]>
