# ChatOutboxLocks

Defined in: [src/lib/chatStore/vaultOutbox.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultOutbox.ts#33)

The part of the Web Locks API the outbox uses to tell a live tab's slot from an orphaned one.

## Methods

### request()

> **request**<`T`>(`name`: `string`, `options`: `object`, `callback`: (`lock`: `object` | `null`) => `T` | `Promise`<`T`>): `Promise`<`T`>

Defined in: [src/lib/chatStore/vaultOutbox.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultOutbox.ts#34)

**Type Parameters**

<table>
<thead>
<tr>
<th>Type Parameter</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`T`

</td>
</tr>
</tbody>
</table>

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

`name`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.ifAvailable?`

</td>
<td>

`boolean`

</td>
</tr>
<tr>
<td>

`callback`

</td>
<td>

(`lock`: `object` | `null`) => `T` | `Promise`<`T`>

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`T`>
