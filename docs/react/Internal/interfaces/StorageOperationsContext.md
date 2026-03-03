# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#138)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#141)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#139)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#147)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#140)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#145)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#143)

Wallet address for encryption (optional - when present, enables field-level encryption)
