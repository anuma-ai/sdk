# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L101)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L104)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L102)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L110)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L103)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L108)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L106)

Wallet address for encryption (optional - when present, enables field-level encryption)
