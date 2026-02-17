# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:127](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L127)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:130](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L130)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:128](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L128)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:136](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L136)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:129](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L129)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:134](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L134)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:132](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L132)

Wallet address for encryption (optional - when present, enables field-level encryption)
