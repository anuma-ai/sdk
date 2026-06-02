# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#140)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#143)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#141)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#149)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#142)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#147)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#145)

Wallet address for encryption (optional - when present, enables field-level encryption)
