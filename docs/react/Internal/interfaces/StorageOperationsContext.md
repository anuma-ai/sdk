# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L102)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L105)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L103)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L111)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L104)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L109)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:107](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L107)

Wallet address for encryption (optional - when present, enables field-level encryption)
