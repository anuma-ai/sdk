# UseEncryptionResult

Defined in: [src/react/useEncryption.ts:1560](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1560)

Result returned by the useEncryption hook.

## Properties

### clearKeyPair()

> **clearKeyPair**: (`walletAddress`: `string`) => `void`

Defined in: [src/react/useEncryption.ts:1570](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1570)

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

Defined in: [src/react/useEncryption.ts:1566](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1566)

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

Defined in: [src/react/useEncryption.ts:1568](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1568)

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

> **requestEncryptionKey**: (`walletAddress`: `string`) => `Promise`<`boolean`>

Defined in: [src/react/useEncryption.ts:1562](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1562)

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

`Promise`<`boolean`>

***

### requestKeyPair()

> **requestKeyPair**: (`walletAddress`: `string`) => `Promise`<`void`>

Defined in: [src/react/useEncryption.ts:1564](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1564)

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
