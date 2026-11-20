# VaultMediaLibraryOptions

Defined in: [src/lib/chatStore/media.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#45)

## Properties

### attachments

> **attachments**: [`VaultAttachments`](VaultAttachments.md)

Defined in: [src/lib/chatStore/media.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#47)

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/media.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#50)

**Returns**

`number`

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/media.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#46)

***

### subscribeChanges()?

> `optional` **subscribeChanges**: (`onChange`: (`connected`: `boolean`) => `void`) => () => `void`

Defined in: [src/lib/chatStore/media.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#49)

A `createVaultRealtime` source for `private_chats`; each report catches up and tells subscribers about remote changes.

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

`onChange`

</td>
<td>

(`connected`: `boolean`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

> (): `void`

**Returns**

`void`
