# PostHog & Request Tracing Integration

This document describes how the AI SDK supports request tracing for analytics and observability with PostHog.

## Overview

The SDK supports passing a trace ID with chat completion requests, enabling:

1. **Frontend-backend correlation**: Match frontend latency measurements with backend processing times
2. **LLM observability**: Track requests through the entire pipeline
3. **Debugging**: Trace specific requests across services

## Trace ID Support

### sendMessage with traceId

The `sendMessage` function accepts an optional `traceId` parameter:

```typescript
import { useChat } from '@reverbia/sdk/react';

const { sendMessage } = useChat({ getToken });

const result = await sendMessage({
  messages: [...],
  model: 'openai/gpt-4',
  traceId: 'your-unique-trace-id', // Optional
  onData: (chunk) => console.log(chunk),
});
```

When provided, the trace ID is sent as an `X-Trace-ID` HTTP header:

```
POST /api/v1/chat/completions
X-Trace-ID: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: Bearer <token>
```

### Generating Trace IDs

Use `crypto.randomUUID()` for unique IDs:

```typescript
function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
```

## Integration with PostHog

### Frontend Tracking

Track requests with PostHog's `$ai_generation` event:

```typescript
import posthog from 'posthog-js';

// Before sending the request
const traceId = generateTraceId();
const startTime = Date.now();

// Send to LLM
const result = await sendMessage({
  messages,
  model,
  traceId,
});

// After receiving response
posthog.capture('$ai_generation', {
  $ai_trace_id: traceId,
  $ai_model: 'gpt-4',
  $ai_provider: 'openai',
  $ai_input_tokens: result.usage?.prompt_tokens,
  $ai_output_tokens: result.usage?.completion_tokens,
  $ai_latency: (Date.now() - startTime) / 1000,
  success: true,
});
```

### Backend Correlation

The backend can read the `X-Trace-ID` header and include it in logs:

```python
# Example backend handler
trace_id = request.headers.get('X-Trace-ID')
logger.info(f"Processing chat completion", extra={
    "trace_id": trace_id,
    "model": request_body.model,
})
```

This allows you to:
- Correlate frontend TTFT (Time to First Token) with backend processing time
- Identify where latency occurs (network, queue, inference)
- Debug specific problematic requests

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Browser)                          │
├─────────────────────────────────────────────────────────────────────┤
│  1. Generate traceId = crypto.randomUUID()                          │
│  2. Start timer                                                     │
│  3. sendMessage({ ..., traceId })                                   │
│                           │                                         │
│                           ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  HTTP Request                                                │   │
│  │  POST /api/v1/chat/completions                              │   │
│  │  X-Trace-ID: 550e8400-e29b-41d4-a716-446655440000           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────│────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend (API)                               │
├─────────────────────────────────────────────────────────────────────┤
│  4. Extract X-Trace-ID header                                       │
│  5. Log trace_id with processing metrics                            │
│  6. Forward to LLM provider                                         │
│  7. Stream response back                                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Browser)                          │
├─────────────────────────────────────────────────────────────────────┤
│  8. Receive first token → record TTFT                               │
│  9. Receive complete response                                       │
│  10. posthog.capture('$ai_generation', { $ai_trace_id: traceId })  │
└─────────────────────────────────────────────────────────────────────┘
```

## Privacy Considerations

The trace ID is:
- A random UUID with no PII
- Not linked to message content
- Used only for request correlation

**Never** include message content in trace metadata. The Memoryless app explicitly omits `$ai_input` and `$ai_output_choices` from PostHog events.

## API Reference

### SendMessageArgs

```typescript
type SendMessageArgs = {
  messages: LlmapiMessage[];
  model: string;
  onData?: (chunk: string) => void;
  traceId?: string;  // Optional trace ID for request correlation
};
```

### HTTP Headers

When `traceId` is provided:

| Header | Value | Description |
|--------|-------|-------------|
| `X-Trace-ID` | UUID string | Unique identifier for the request |

## See Also

- [PostHog LLM Observability](https://posthog.com/docs/ai-engineering/observability)
- [Memoryless POSTHOG.md](../../ai-memoryless-client/docs/POSTHOG.md) - Frontend integration details
