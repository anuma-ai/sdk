# chatStorageSchema

> `const` **chatStorageSchema**: `Readonly`\<\{ `tables`: `TableMap`; `unsafeSql?`: (`_`, `__`) => `string`; `version`: `number`; \}\>

Defined in: [src/lib/chatStorage/schema.ts:10](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/schema.ts#L10)

WatermelonDB schema for chat storage

Defines two tables:
- history: Chat messages with metadata
- conversations: Conversation metadata
