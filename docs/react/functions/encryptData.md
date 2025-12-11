---
title: encryptData
---

[SDK Documentation](../../README.md) / [react](../README.md) / encryptData

# Function: encryptData()

> **encryptData**(`plaintext`, `address`): `Promise`\<`string`\>

Defined in: [react/useEncryption.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L115)

Encrypts data using AES-GCM with the stored encryption key

## Parameters

### plaintext

The data to encrypt (string or Uint8Array)

`string` | `Uint8Array`\<`ArrayBufferLike`\>

### address

`string`

## Returns

`Promise`\<`string`\>

Encrypted data as hex string (IV + ciphertext + auth tag)
