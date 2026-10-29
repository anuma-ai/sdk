# VaultChatEvent

> **VaultChatEvent** = { `origin`: `"local"` | `"remote"`; `type`: `"conversations"`; } | { `conversationId`: `string`; `origin`: `"local"` | `"remote"`; `type`: `"messages"`; } | { `conversationId`: `string`; `origin`: `"local"` | `"remote"`; `type`: `"summary"`; } | { `conversationId`: `string`; `origin`: `"local"` | `"remote"`; `type`: `"links"`; } | { `pending`: `number`; `stopped?`: `string`; `type`: `"outbox"`; } | { `id`: `string`; `kind`: [`ChatRecordKind`](ChatRecordKind.md); `reason`: `"missing"` | `"storage_quota"` | `"invalid"` | `"conversation_deleted"`; `type`: `"dropped"`; } | { `type`: `"vector_quota"`; }

Defined in: [src/lib/chatStore/vaultBackend.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#65)

A change to the cached chats; `origin` is "remote" when another device or tab made it.
