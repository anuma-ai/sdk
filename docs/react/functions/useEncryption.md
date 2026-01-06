# useEncryption()

> **useEncryption**(`signMessage`: [`SignMessageFn`](../type-aliases/SignMessageFn.md)): \{ `clearKeyPair`: (`walletAddress`: `string`) => `void`; `exportPublicKey`: (`walletAddress`: `string`) => `Promise`\<`string`\>; `hasKeyPair`: (`walletAddress`: `string`) => `boolean`; `requestEncryptionKey`: (`walletAddress`: `string`) => `Promise`\<`void`\>; `requestKeyPair`: (`walletAddress`: `string`) => `Promise`\<`void`\>; \}

Defined in: [src/react/useEncryption.ts:677](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L677)

Hook that provides encryption key management for securing local data.

This hook helps you encrypt and decrypt data using a key derived from a wallet
signature. It requires `@privy-io/react-auth` for wallet authentication. Keys are
stored in memory only and do not persist across page reloads for security.

## How it works

1. User signs a message with their wallet
2. The signature is used to deterministically derive an encryption key
3. The key is stored in memory (not localStorage) for the session
4. Data can be encrypted/decrypted using this key
5. On page reload, user must sign again to derive the key

## Security Features

- **In-memory only**: Keys never touch disk or localStorage
- **Deterministic**: Same wallet + signature always generates same key
- **Session-scoped**: Keys cleared on page reload
- **XSS-resistant**: Keys not accessible after page reload

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `signMessage` | [`SignMessageFn`](../type-aliases/SignMessageFn.md) | Function to sign a message (from Privy's useSignMessage hook) |

## Returns

\{ `clearKeyPair`: (`walletAddress`: `string`) => `void`; `exportPublicKey`: (`walletAddress`: `string`) => `Promise`\<`string`\>; `hasKeyPair`: (`walletAddress`: `string`) => `boolean`; `requestEncryptionKey`: (`walletAddress`: `string`) => `Promise`\<`void`\>; `requestKeyPair`: (`walletAddress`: `string`) => `Promise`\<`void`\>; \}

Functions to request encryption keys and manage key pairs

### clearKeyPair()

> **clearKeyPair**: (`walletAddress`: `string`) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

#### Returns

`void`

### exportPublicKey()

> **exportPublicKey**: (`walletAddress`: `string`) => `Promise`\<`string`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

#### Returns

`Promise`\<`string`\>

### hasKeyPair()

> **hasKeyPair**: (`walletAddress`: `string`) => `boolean`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

#### Returns

`boolean`

### requestEncryptionKey()

> **requestEncryptionKey**: (`walletAddress`: `string`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

#### Returns

`Promise`\<`void`\>

### requestKeyPair()

> **requestKeyPair**: (`walletAddress`: `string`) => `Promise`\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

#### Returns

`Promise`\<`void`\>

## Examples

```tsx
import { usePrivy } from "@privy-io/react-auth";
import { useEncryption, encryptData, decryptData } from "@reverbia/sdk/react";

function SecureComponent() {
  const { user, signMessage } = usePrivy();
  const { requestEncryptionKey } = useEncryption(signMessage);

  // Request encryption key when user is authenticated
  useEffect(() => {
    if (user?.wallet?.address) {
      // This will prompt user to sign if key doesn't exist
      await requestEncryptionKey(user.wallet.address);
    }
  }, [user]);

  // Encrypt data
  const saveSecret = async (text: string) => {
    const encrypted = await encryptData(text, user.wallet.address);
    localStorage.setItem("secret", encrypted);
  };

  // Decrypt data
  const loadSecret = async () => {
    const encrypted = localStorage.getItem("secret");
    if (encrypted) {
      const decrypted = await decryptData(encrypted, user.wallet.address);
      console.log(decrypted);
    }
  };

  return (
    <div>
      <button onClick={() => saveSecret("my secret data")}>Encrypt & Save</button>
      <button onClick={loadSecret}>Load & Decrypt</button>
    </div>
  );
}
```

```tsx
// ECDH key pair generation for end-to-end encryption
import { usePrivy } from "@privy-io/react-auth";
import { useEncryption } from "@reverbia/sdk/react";

function E2EEComponent() {
  const { signMessage } = usePrivy();
  const { requestKeyPair, exportPublicKey } = useEncryption(signMessage);

  const setupEncryption = async (walletAddress: string) => {
    // Generate deterministic ECDH key pair from wallet signature
    await requestKeyPair(walletAddress);

    // Export public key to share with others
    const publicKey = await exportPublicKey(walletAddress);
    console.log("Share this public key:", publicKey);
  };
}
```
