# getConversationsLazyOp

> **getConversationsLazyOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)): `Promise`<[`LazyStoredConversation`](../interfaces/LazyStoredConversation.md)\[]>

Defined in: [src/lib/db/chat/operations.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#291)

Lazy variant of getConversationsOp.

Returns conversations with their raw stored title under
`encryptedTitle` instead of a decrypted `title`. Callers should pair
this with [decryptConversationTitle](decryptConversationTitle.md) (or the underlying
`decryptField`) and decrypt only when a row is rendered.

Behavior is identical to `getConversationsOp` except for the title
projection — sort order, soft-delete filtering, and active-conversation
scoping all match.

Encryption context on `ctx` is intentionally ignored: this op never
decrypts. That is also why the test for this op asserts call count
for `decryptField` is exactly zero.

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
</tbody>
</table>

## Returns

`Promise`<[`LazyStoredConversation`](../interfaces/LazyStoredConversation.md)\[]>
