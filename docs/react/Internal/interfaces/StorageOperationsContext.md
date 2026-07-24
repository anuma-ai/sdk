# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#319)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:322](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#322)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:320](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#320)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:328](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#328)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#321)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#326)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:324](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#324)

Wallet address for encryption (optional - when present, enables field-level encryption)
