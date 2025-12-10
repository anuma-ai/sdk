# Request Tracing

The SDK supports custom headers for request tracing and observability.

## Usage

The `sendMessage` function accepts an optional `headers` parameter:

```typescript
import { useChat } from '@reverbia/sdk/react';

const { sendMessage } = useChat({ getToken });

const result = await sendMessage({
  messages: [...],
  model: 'openai/gpt-4',
  headers: {
    'X-Trace-ID': crypto.randomUUID(),
    'X-Trace-Source': 'memoryless',
  },
});
```

Custom headers are merged with the default headers (`Content-Type` and `Authorization`).

## Enabling in Memoryless Client

The consumer code in `packages/hooks` has custom headers temporarily disabled pending SDK publication.

Once published, update `packages/hooks/src/useCallChatCompletion.ts`:

1. **Line ~191**: Rename `_headers` to `headers`

2. **Lines ~265-266**: Uncomment `headers` in `sendMessage`:
   ```typescript
   const result = await sendMessage({
     messages: conversationMessages,
     model,
     onData,
     headers, // Uncomment this line
   });
   ```
