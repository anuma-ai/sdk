# VaultAttachmentsOptions

Defined in: [src/lib/chatStore/vaultAttachments.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#38)

## Properties

### cache?

> `optional` **cache**: [`VaultAttachmentCache`](VaultAttachmentCache.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#41)

***

### fetch()?

> `optional` **fetch**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/chatStore/vaultAttachments.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#42)

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

Defined in: [src/lib/chatStore/vaultAttachments.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#40)

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#45)

**Returns**

`number`

***

### retries?

> `optional` **retries**: `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#43)

***

### retryDelayMs?

> `optional` **retryDelayMs**: `number`

Defined in: [src/lib/chatStore/vaultAttachments.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#44)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultAttachments.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#39)
