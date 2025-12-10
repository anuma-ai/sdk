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
