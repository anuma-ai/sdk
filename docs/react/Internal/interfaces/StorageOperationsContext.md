# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#168)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#171)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#169)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#177)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#170)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#175)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#173)

Wallet address for encryption (optional - when present, enables field-level encryption)
