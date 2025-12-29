# requestKeyPair()

> **requestKeyPair**(`walletAddress`, `signMessage`): `Promise`\<`void`\>

Defined in: [src/react/useEncryption.ts:573](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L573)

Requests the user to sign a message to generate an ECDH key pair.
If a key pair already exists in memory for the given wallet, resolves immediately.

Note: Key pairs are stored in memory only and do not persist across page reloads.
This is a security feature - users must sign once per session to derive their key pair.

Handles Privy rate limits (429 errors) with automatic retry and exponential backoff.

## Parameters

### walletAddress

`string`

The wallet address to generate the key pair for

### signMessage

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

Function to sign a message (returns signature hex string)

## Returns

`Promise`\<`void`\>

Promise that resolves when the key pair is available
