# WalletPoller

Defined in: [src/lib/db/queue/walletPoller.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/walletPoller.ts#11)

## Constructors

### Constructor

> **new WalletPoller**(): `WalletPoller`

**Returns**

`WalletPoller`

## Methods

### startPolling()

> **startPolling**(`checkWallet`: () => `Promise`<`string` | `null`>, `onWalletReady`: (`address`: `string`) => `void`, `intervalMs`: `number`, `maxAttempts`: `number`): () => `void`

Defined in: [src/lib/db/queue/walletPoller.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/walletPoller.ts#24)

Start polling for wallet availability.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`checkWallet`

</td>
<td>

() => `Promise`<`string` | `null`>

</td>
<td>

`undefined`

</td>
<td>

Returns wallet address when ready, null if not yet available

</td>
</tr>
<tr>
<td>

`onWalletReady`

</td>
<td>

(`address`: `string`) => `void`

</td>
<td>

`undefined`

</td>
<td>

Called with the wallet address when it becomes available

</td>
</tr>
<tr>
<td>

`intervalMs`

</td>
<td>

`number`

</td>
<td>

`DEFAULT_INTERVAL_MS`

</td>
<td>

Polling interval in milliseconds (default: 1000ms)

</td>
</tr>
<tr>
<td>

`maxAttempts`

</td>
<td>

`number`

</td>
<td>

`DEFAULT_MAX_ATTEMPTS`

</td>
<td>

Maximum polling attempts before giving up (default: 60)

</td>
</tr>
</tbody>
</table>

**Returns**

Stop function to cancel polling

> (): `void`

**Returns**

`void`

***

### stop()

> **stop**(): `void`

Defined in: [src/lib/db/queue/walletPoller.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/queue/walletPoller.ts#62)

Stop polling.

**Returns**

`void`
