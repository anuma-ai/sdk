# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:324](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#324)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#327)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#325)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:333](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#333)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#326)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:331](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#331)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#329)

Wallet address for encryption (optional - when present, enables field-level encryption)
