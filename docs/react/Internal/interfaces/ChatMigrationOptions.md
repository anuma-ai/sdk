# ChatMigrationOptions

Defined in: [src/lib/chatStore/migrateChats.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#34)

## Properties

### allowSkipped?

> `optional` **allowSkipped**: `boolean`

Defined in: [src/lib/chatStore/migrateChats.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#47)

Activate even when some rows could not be read; they stay on the device.

***

### database

> **database**: `Database`

Defined in: [src/lib/chatStore/migrateChats.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#36)

The device's local chat database.

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/chatStore/migrateChats.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#41)

***

### maxStorageBytes?

> `optional` **maxStorageBytes**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#49)

***

### maxVectors?

> `optional` **maxVectors**: `number`

Defined in: [src/lib/chatStore/migrateChats.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#48)

***

### onActivated()

> **onActivated**: () => `void` | `Promise`<`void`>

Defined in: [src/lib/chatStore/migrateChats.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#45)

Called once vault holds everything; hand the device over to vault here.

**Returns**

`void` | `Promise`<`void`>

***

### onProgress()?

> `optional` **onProgress**: (`progress`: [`ChatMigrationProgress`](ChatMigrationProgress.md)) => `void`

Defined in: [src/lib/chatStore/migrateChats.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#51)

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

Defined in: [src/lib/chatStore/migrateChats.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#50)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/chatStore/migrateChats.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#40)

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/migrateChats.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#38)

Vault, opened with the account's canonical key.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/chatStore/migrateChats.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#39)

***

### withWriteBarrier()

> **withWriteBarrier**: (`task`: () => `Promise`<[`ChatMigrationResult`](ChatMigrationResult.md)>) => `Promise`<[`ChatMigrationResult`](ChatMigrationResult.md)>

Defined in: [src/lib/chatStore/migrateChats.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#43)

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
