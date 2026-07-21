# getConversationsPageOp

> **getConversationsPageOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `options?`: [`GetConversationsPageOptions`](../interfaces/GetConversationsPageOptions.md)): `Promise`<[`LazyStoredConversation`](../interfaces/LazyStoredConversation.md)\[]>

Defined in: [src/lib/db/chat/operations.ts:469](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#469)

Keyset-paginated, lazy (no-decrypt) variant of [getConversationsLazyOp](getConversationsLazyOp.md).

Returns at most `limit` conversations (newest first by `created_at`), each
with its raw stored title under `encryptedTitle` — pair with
[decryptConversationTitle](decryptConversationTitle.md) to decrypt on render. Page through older
threads by passing the oldest loaded `createdAt` as `before` plus the
uniqueIds held at that boundary as `boundaryExcludeUniqueIds`.

Decrypts nothing and builds no WatermelonDB Model (the never-evicted
RecordCache stays empty — web Pile-2). Sort order, soft-delete filtering,
and the encrypted-title projection all match `getConversationsLazyOp`.

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

`ctx`

</td>
<td>

[`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`GetConversationsPageOptions`](../interfaces/GetConversationsPageOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`LazyStoredConversation`](../interfaces/LazyStoredConversation.md)\[]>
