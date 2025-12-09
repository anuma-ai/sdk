# Request Tracing

The SDK supports passing a trace ID with chat completion requests for observability and debugging.

## Usage

The `sendMessage` function accepts an optional `traceId` parameter:

```typescript
import { useChat } from '@reverbia/sdk/react';

const { sendMessage } = useChat({ getToken });

const result = await sendMessage({
  messages: [...],
  model: 'openai/gpt-4',
  traceId: crypto.randomUUID(),
});
```

When provided, the trace ID is sent as an `X-Trace-ID` HTTP header:

```
POST /api/v1/chat/completions
X-Trace-ID: 550e8400-e29b-41d4-a716-446655440000
```

## API Reference

### SendMessageArgs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | `LlmapiMessage[]` | Yes | Chat messages |
| `model` | `string` | Yes | Model identifier |
| `onData` | `(chunk: string) => void` | No | Streaming callback |
| `traceId` | `string` | No | Trace ID for request correlation |

### HTTP Headers

When `traceId` is provided:

| Header | Value | Description |
|--------|-------|-------------|
| `X-Trace-ID` | UUID string | Unique identifier for the request |

## Enabling in Memoryless Client

The consumer code in `packages/hooks` has trace ID temporarily disabled pending SDK publication to npm.

Once published, update `packages/hooks/src/useCallChatCompletion.ts`:

1. **Line ~192**: Rename `_traceId` to `traceId`

2. **Lines ~267-268**: Uncomment `traceId` in `sendMessage`:
   ```typescript
   const result = await sendMessage({
     messages: conversationMessages,
     model,
     onData,
     traceId, // Uncomment this line
   });
   ```

3. Remove the ESLint disable comment for the unused variable.
