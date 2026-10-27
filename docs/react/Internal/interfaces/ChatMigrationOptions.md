# ChatMigrationOptions

Defined in: [src/lib/chatStore/migrateChats.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#27)

## Properties

### allowSkipped?

> `optional` **allowSkipped**: `boolean`

Defined in: [src/lib/chatStore/migrateChats.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#40)

Activate even when some rows could not be read; they stay on the device.

***

### database

> **database**: `Database`

Defined in: [src/lib/chatStore/migrateChats.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#29)

The device's local chat database.

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/chatStore/migrateChats.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#34)

***

### maxStorageBytes?

> `optional` **maxStorageBytes**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#42)

***

### maxVectors?

> `optional` **maxVectors**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#41)

***

### onActivated()

> **onActivated**: () => `void` | `Promise`<`void`>

Defined in: [src/lib/chatStore/migrateChats.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#38)

Called once vault holds everything; hand the device over to vault here.

**Returns**

`void` | `Promise`<`void`>

***

### onProgress()?

> `optional` **onProgress**: (`progress`: [`ChatMigrationProgress`](ChatMigrationProgress.md)) => `void`

Defined in: [src/lib/chatStore/migrateChats.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#44)

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

`progress`

</td>
<td>

[`ChatMigrationProgress`](ChatMigrationProgress.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/migrateChats.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#43)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/chatStore/migrateChats.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#33)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/migrateChats.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#31)

Vault, opened with the account's canonical key.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/chatStore/migrateChats.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#32)

***

### withWriteBarrier()

> **withWriteBarrier**: (`task`: () => `Promise`<[`ChatMigrationResult`](ChatMigrationResult.md)>) => `Promise`<[`ChatMigrationResult`](ChatMigrationResult.md)>

Defined in: [src/lib/chatStore/migrateChats.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#36)

Runs the final pass while local chat writers are held, so nothing lands locally after it.

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

`task`

</td>
<td>

() => `Promise`<[`ChatMigrationResult`](ChatMigrationResult.md)>

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`ChatMigrationResult`](ChatMigrationResult.md)>
