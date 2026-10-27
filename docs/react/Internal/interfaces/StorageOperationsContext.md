# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#278)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#281)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#279)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:287](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#287)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#280)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:285](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#285)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:283](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#283)

Wallet address for encryption (optional - when present, enables field-level encryption)
