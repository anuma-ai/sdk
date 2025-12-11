---
title: decryptData
---

[SDK Documentation](../../README.md) / [react](../README.md) / decryptData

# Function: decryptData()

> **decryptData**(`encryptedHex`, `address`): `Promise`\<`string`\>

Defined in: [react/useEncryption.ts:155](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L155)

Decrypts data using AES-GCM with the stored encryption key

## Parameters

### encryptedHex

`string`

Encrypted data as hex string (IV + ciphertext + auth tag)

### address

`string`

## Returns

`Promise`\<`string`\>

Decrypted data as string
