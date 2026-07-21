# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#317)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:320](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#320)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:318](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#318)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#326)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#319)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:324](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#324)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:322](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#322)

Wallet address for encryption (optional - when present, enables field-level encryption)
