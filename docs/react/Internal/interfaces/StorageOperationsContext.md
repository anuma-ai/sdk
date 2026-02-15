# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:126](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L126)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:129](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L129)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:127](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L127)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:135](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L135)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:128](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L128)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:133](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L133)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:131](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L131)

Wallet address for encryption (optional - when present, enables field-level encryption)
