# Using Memories in Your Chat Application

This guide shows you how to fetch and use memories related to your conversation in a client-side application.

## Basic Setup

```tsx
import { useChat, useMemory } from '@your-sdk/react';
import { formatMemoriesForChat, extractConversationContext } from '@your-sdk/lib/memory/chat';

function ChatComponent() {
  const getToken = async () => {
    // Your auth token logic
    return await getAuthToken();
  };

  const { sendMessage, isLoading } = useChat({ getToken });
  const { searchMemories, extractMemoriesFromMessage } = useMemory({
    getToken,
    embeddingModel: "openai/text-embedding-3-small",
  });

  // ... rest of your component
}
```

## Strategy 1: Search Memories Before Sending Message

Search for relevant memories based on the current user message, then include them in your chat context:

```tsx
async function handleSendMessage(userMessage: string) {
  // 1. Search for relevant memories
  const relevantMemories = await searchMemories(
    userMessage,           // Query: the user's current message
    5,                     // Limit: top 5 most relevant memories
    0.7                    // Min similarity: only memories with 70%+ similarity
  );

  // 2. Format memories for chat context
  const memoryContext = formatMemoriesForChat(relevantMemories, "compact");
  
  // 3. Build messages with memory context
  const messages = [
    {
      role: "system",
      content: memoryContext 
        ? `You are a helpful assistant. Here's what I know about the user:\n\n${memoryContext}`
        : "You are a helpful assistant."
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  // 4. Send message with context
  const result = await sendMessage({ messages, model: "gpt-4o" });
  
  // 5. Extract new memories from the conversation (optional)
  await extractMemoriesFromMessage({
    messages: [{ role: "user", content: userMessage }],
    model: "gpt-4o"
  });
}
```

## Strategy 2: Use Conversation Context for Search

Search using the entire conversation context (last few messages) for better relevance:

```tsx
import { extractConversationContext } from '@your-sdk/lib/memory/chat';

async function handleSendMessage(userMessage: string, conversationHistory: Array<{role: string, content: string}>) {
  // 1. Extract context from recent conversation
  const conversationContext = extractConversationContext(
    [...conversationHistory, { role: "user", content: userMessage }],
    3  // Use last 3 user messages
  );

  // 2. Search memories using conversation context
  const relevantMemories = await searchMemories(conversationContext, 5, 0.7);

  // 3. Format and include in messages
  const memoryContext = formatMemoriesForChat(relevantMemories);
  
  const messages = [
    ...(memoryContext ? [{
      role: "system",
      content: `User context:\n${memoryContext}`
    }] : []),
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  const result = await sendMessage({ messages, model: "gpt-4o" });
}
```

## Strategy 3: Complete Chat Component Example

Here's a complete example that integrates memory search into a chat interface:

```tsx
import { useState, useCallback } from 'react';
import { useChat, useMemory } from '@your-sdk/react';
import { formatMemoriesForChat, extractConversationContext } from '@your-sdk/lib/memory/chat';
import type { LlmapiMessage } from '@your-sdk/client';

function ChatWithMemory() {
  const [messages, setMessages] = useState<LlmapiMessage[]>([]);
  const [input, setInput] = useState('');

  const getToken = async () => {
    // Your auth implementation
    return localStorage.getItem('auth_token');
  };

  const { sendMessage, isLoading } = useChat({ getToken });
  const { searchMemories, extractMemoriesFromMessage } = useMemory({
    getToken,
    embeddingModel: "openai/text-embedding-3-small",
    generateEmbeddings: true,
  });

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to conversation
    const newMessages: LlmapiMessage[] = [
      ...messages,
      { role: 'user', content: userMessage }
    ];
    setMessages(newMessages);

    try {
      // 1. Search for relevant memories
      const conversationContext = extractConversationContext(newMessages, 3);
      const relevantMemories = await searchMemories(conversationContext, 5, 0.7);

      // 2. Build messages with memory context
      const messagesWithContext: LlmapiMessage[] = [];
      
      if (relevantMemories.length > 0) {
        const memoryContext = formatMemoriesForChat(relevantMemories, "compact");
        messagesWithContext.push({
          role: 'system',
          content: `Here's what I know about the user:\n\n${memoryContext}\n\nUse this information to provide personalized responses.`
        });
      }

      messagesWithContext.push(...newMessages);

      // 3. Send message
      const result = await sendMessage({
        messages: messagesWithContext,
        model: 'gpt-4o'
      });

      if (result.error) {
        console.error('Error:', result.error);
        return;
      }

      // 4. Add assistant response
      const assistantMessage = result.data?.choices?.[0]?.message;
      if (assistantMessage) {
        setMessages([...newMessages, assistantMessage]);
      }

      // 5. Extract new memories from the conversation (async, don't block)
      extractMemoriesFromMessage({
        messages: newMessages,
        model: 'gpt-4o'
      }).catch(err => console.error('Memory extraction failed:', err));

    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [input, messages, isLoading, sendMessage, searchMemories, extractMemoriesFromMessage]);

  return (
    <div>
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        disabled={isLoading}
      />
      <button onClick={handleSend} disabled={isLoading}>
        Send
      </button>
    </div>
  );
}
```

## Strategy 4: Pre-fetch Memories on Component Mount

If you want to load relevant memories when the chat starts:

```tsx
import { useEffect, useState } from 'react';
import { useMemory } from '@your-sdk/react';
import type { StoredMemoryItem } from '@your-sdk/lib/memory/db';

function ChatWithPreloadedMemory() {
  const [initialMemories, setInitialMemories] = useState<Array<StoredMemoryItem & { similarity: number }>>([]);
  
  const { searchMemories } = useMemory({
    getToken: async () => getAuthToken(),
  });

  useEffect(() => {
    // Load general user context when component mounts
    searchMemories("user preferences identity", 10, 0.6)
      .then(setInitialMemories)
      .catch(console.error);
  }, []);

  // Use initialMemories in your system message
  const systemMessage = initialMemories.length > 0
    ? formatMemoriesForChat(initialMemories)
    : "You are a helpful assistant.";
}
```

## Memory Format Options

The `formatMemoriesForChat` function supports two formats:

### Compact Format (default)
```
[identity]
name: Charlie
company: ZetaChain

[preference]
verbosity: concise_direct
```

### Detailed Format
```
[identity]
- name: Charlie (identity, confidence: 0.98, relevance: 0.95)
  Evidence: "I'm Charlie"
- company: ZetaChain (identity, confidence: 0.99, relevance: 0.92)
  Evidence: "called ZetaChain"
```

## Best Practices

1. **Search before sending**: Always search for memories before sending a message to include relevant context
2. **Use conversation context**: Use `extractConversationContext` to search based on recent conversation, not just the current message
3. **Adjust similarity threshold**: Lower threshold (0.6-0.7) for broader context, higher (0.8+) for highly relevant only
4. **Limit results**: Keep memory context concise (3-7 memories) to avoid token bloat
5. **Extract memories asynchronously**: Don't block message sending while extracting new memories
6. **Handle errors gracefully**: Memory search failures shouldn't break your chat flow

## API Reference

### `searchMemories(query, limit?, minSimilarity?)`

- **query**: Text to search for (user message or conversation context)
- **limit**: Maximum number of results (default: 10)
- **minSimilarity**: Minimum similarity score 0-1 (default: 0.7)
- **Returns**: Array of memories with similarity scores, sorted by relevance

### `formatMemoriesForChat(memories, format?)`

- **memories**: Array of memory items (from `searchMemories`)
- **format**: `"compact"` or `"detailed"` (default: `"compact"`)
- **Returns**: Formatted string ready for chat context

### `extractConversationContext(messages, maxMessages?)`

- **messages**: Array of chat messages
- **maxMessages**: Number of recent user messages to include (default: 3)
- **Returns**: Combined text query for memory search

