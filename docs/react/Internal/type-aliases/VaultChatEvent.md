# VaultChatEvent

> **VaultChatEvent** = { `type`: `"conversations"`; } | { `conversationId`: `string`; `type`: `"messages"`; } | { `conversationId`: `string`; `type`: `"summary"`; } | { `conversationId`: `string`; `type`: `"links"`; } | { `pending`: `number`; `stopped?`: `string`; `type`: `"outbox"`; } | { `id`: `string`; `kind`: [`ChatRecordKind`](ChatRecordKind.md); `reason`: `"missing"` | `"storage_quota"` | `"invalid"` | `"conversation_deleted"`; `type`: `"dropped"`; } | { `type`: `"vector_quota"`; }

Defined in: [src/lib/chatStore/vaultBackend.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#59)
