# UseEncryptionResult

Defined in: [src/react/useEncryption.ts:1007](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1007)

Result returned by the useEncryption hook.

## Properties

### clearKeyPair()

> **clearKeyPair**: (`walletAddress`: `string`) => `void`

Defined in: [src/react/useEncryption.ts:1017](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1017)

Clear the key pair for a wallet address from memory

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### exportPublicKey()

> **exportPublicKey**: (`walletAddress`: `string`) => `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:1013](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1013)

Export the public key for a wallet address as base64-encoded SPKI

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>

***

### hasKeyPair()

> **hasKeyPair**: (`walletAddress`: `string`) => `boolean`

Defined in: [src/react/useEncryption.ts:1015](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1015)

Check if a key pair exists in memory for a wallet address

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`boolean`

***

### requestEncryptionKey()

> **requestEncryptionKey**: (`walletAddress`: `string`) => `Promise`<`void`>

Defined in: [src/react/useEncryption.ts:1009](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1009)

Request and generate an encryption key for a wallet address

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### requestKeyPair()

> **requestKeyPair**: (`walletAddress`: `string`) => `Promise`<`void`>

Defined in: [src/react/useEncryption.ts:1011](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1011)

Request and generate an ECDH key pair for a wallet address

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>
