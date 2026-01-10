# useEncryption

> **useEncryption**(`signMessage`: [`SignMessageFn`](../Internal/type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../Internal/type-aliases/EmbeddedWalletSignerFn.md)): [`UseEncryptionResult`](UseEncryptionResult.md)

Defined in: src/react/useEncryption.ts:1081

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

* **In-memory only**: Keys never touch disk or localStorage
* **Deterministic**: Same wallet + signature always generates same key
* **Session-scoped**: Keys cleared on page reload
* **XSS-resistant**: Keys not accessible after page reload

## Embedded Wallet Support

For Privy embedded wallets, you can provide an `embeddedWalletSigner` function
to enable silent signing without user confirmation modals. This is useful for
deterministic key generation that should happen automatically.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`signMessage`

</td>
<td>

[`SignMessageFn`](../Internal/type-aliases/SignMessageFn.md)

</td>
<td>

Function to sign a message (from Privy's useSignMessage hook)

</td>
</tr>
<tr>
<td>

`embeddedWalletSigner?`

</td>
<td>

[`EmbeddedWalletSignerFn`](../Internal/type-aliases/EmbeddedWalletSignerFn.md)

</td>
<td>

Optional function for silent signing with embedded wallets

</td>
</tr>
</tbody>
</table>

## Returns

[`UseEncryptionResult`](UseEncryptionResult.md)

Functions to request encryption keys and manage key pairs

## Examples

```tsx
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEncryption, encryptData, decryptData } from "@reverbia/sdk/react";

function SecureComponent() {
  const { user, signMessage } = usePrivy();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');

  // Create silent signer for embedded wallets
  const embeddedSigner = useCallback(async (message: string) => {
    if (embeddedWallet) {
      const { signature } = await embeddedWallet.signMessage({ message });
      return signature;
    }
    throw new Error('No embedded wallet');
  }, [embeddedWallet]);

  const { requestEncryptionKey } = useEncryption(signMessage, embeddedSigner);

  // Request encryption key when user is authenticated
  useEffect(() => {
    if (user?.wallet?.address) {
      // This will use silent signing for embedded wallets
      await requestEncryptionKey(user.wallet.address);
    }
  }, [user]);

  // Encrypt data
  const saveSecret = async (text: string) => {
    const encrypted = await encryptData(text, user.wallet.address);
    localStorage.setItem("mySecret", encrypted);
  };

  // Decrypt data
  const loadSecret = async () => {
    const encrypted = localStorage.getItem("mySecret");
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
// Standard usage with external wallets (shows confirmation modal)
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
