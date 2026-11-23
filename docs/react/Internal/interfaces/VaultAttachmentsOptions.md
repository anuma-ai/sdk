# VaultAttachmentsOptions

Defined in: [src/lib/chatStore/vaultAttachments.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#75)

## Properties

### cache?

> `optional` **cache**: [`VaultAttachmentCache`](VaultAttachmentCache.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#78)

***

### fetch()?

> `optional` **fetch**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/chatStore/vaultAttachments.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#79)

**Call Signature**

> (`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

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

`input`

</td>
<td>

`RequestInfo` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

**Call Signature**

> (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

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

`input`

</td>
<td>

`string` | `Request` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

***

### keyRing

> **keyRing**: [`MemoryKeyRing`](MemoryKeyRing.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#77)

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#82)

**Returns**

`number`

***

### retries?

> `optional` **retries**: `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#80)

***

### retryDelayMs?

> `optional` **retryDelayMs**: `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#81)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#76)
