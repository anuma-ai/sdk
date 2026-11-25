# UseFilesOptions

Defined in: [src/react/useFiles.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#63)

Options for useFiles hook.

## Properties

### database

> **database**: `Database`

Defined in: [src/react/useFiles.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#65)

WatermelonDB database instance

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/react/useFiles.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#69)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/react/useFiles.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#68)

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/react/useFiles.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#67)

Wallet address for user context (required for most operations and file decryption)
