# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#266)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:269](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#269)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#267)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#275)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#268)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#273)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#271)

Wallet address for encryption (optional - when present, enables field-level encryption)
