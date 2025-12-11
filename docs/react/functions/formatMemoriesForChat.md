---
title: formatMemoriesForChat
---

[SDK Documentation](../../README.md) / [react](../README.md) / formatMemoriesForChat

# Function: formatMemoriesForChat()

> **formatMemoriesForChat**(`memories`, `format`): `string`

Defined in: [lib/memory/chat.ts:9](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L9)

Format memories into a context string that can be included in chat messages

## Parameters

### memories

`StoredMemoryItem` & `object`[]

Array of memories with similarity scores

### format

Format style: "compact" (key-value pairs) or "detailed" (includes evidence)

`"compact"` | `"detailed"`

## Returns

`string`

Formatted string ready to include in system/user message
