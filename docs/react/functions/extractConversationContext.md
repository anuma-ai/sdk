---
title: extractConversationContext
---

[SDK Documentation](../../README.md) / [react](../README.md) / extractConversationContext

# Function: extractConversationContext()

> **extractConversationContext**(`messages`, `maxMessages`): `string`

Defined in: [lib/memory/chat.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L88)

Extract conversation context from messages for memory search

## Parameters

### messages

`object`[]

Array of chat messages

### maxMessages

`number` = `3`

Maximum number of recent messages to include (default: 3)

## Returns

`string`

Combined text query for memory search
