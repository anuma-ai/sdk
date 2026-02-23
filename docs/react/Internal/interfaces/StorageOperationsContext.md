# StorageOperationsContext

Defined in: [src/lib/db/chat/operations.ts:137](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L137)

## Properties

### conversationsCollection

> **conversationsCollection**: `Collection`<[`ChatConversation`](../classes/ChatConversation.md)>

Defined in: [src/lib/db/chat/operations.ts:140](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L140)

***

### database

> **database**: `Database`

Defined in: [src/lib/db/chat/operations.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L138)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/chat/operations.ts:146](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L146)

Function for silent signing with embedded wallets

***

### messagesCollection

> **messagesCollection**: `Collection`<[`ChatMessage`](../classes/ChatMessage.md)>

Defined in: [src/lib/db/chat/operations.ts:139](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L139)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/chat/operations.ts:144](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L144)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/chat/operations.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L142)

Wallet address for encryption (optional - when present, enables field-level encryption)
