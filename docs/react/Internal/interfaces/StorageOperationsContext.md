# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#271)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#274)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#272)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#280)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#273)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#278)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:276](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#276)

Wallet address for encryption (optional - when present, enables field-level encryption)
