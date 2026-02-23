# UseEncryptionResult

Defined in: [src/react/useEncryption.ts:1048](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1048)

Result returned by the useEncryption hook.

## Properties

### clearKeyPair()

> **clearKeyPair**: (`walletAddress`: `string`) => `void`

Defined in: [src/react/useEncryption.ts:1058](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1058)

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

Defined in: [src/react/useEncryption.ts:1054](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1054)

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

Defined in: [src/react/useEncryption.ts:1056](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1056)

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

Defined in: [src/react/useEncryption.ts:1050](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1050)

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

Defined in: [src/react/useEncryption.ts:1052](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1052)

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
