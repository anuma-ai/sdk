---
title: decryptDataBytes
---

[SDK Documentation](../../README.md) / [react](../README.md) / decryptDataBytes

# Function: decryptDataBytes()

> **decryptDataBytes**(`encryptedHex`, `address`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [react/useEncryption.ts:187](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L187)

Decrypts data and returns as Uint8Array (for binary data)

## Parameters

### encryptedHex

`string`

Encrypted data as hex string (IV + ciphertext + auth tag)

### address

`string`

## Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Decrypted data as Uint8Array
