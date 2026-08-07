# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#325)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:328](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#328)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#326)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#334)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#327)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:332](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#332)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:330](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#330)

Wallet address for encryption (optional - when present, enables field-level encryption)
