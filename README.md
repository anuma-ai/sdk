# Anuma SDK

A TypeScript SDK for building AI-powered applications with streaming chat
completions, long-term memory, tool calling, and end-to-end encryption.

To learn more, check out the [Documentation](https://docs.anuma.ai/).

## Installation

```bash
npm install @anuma/sdk@next
```

## Getting Started

Create an app on the [Anuma Dashboard](https://dashboard.anuma.ai/) to get your
API key or configure Privy authentication.

## Usage

### React Hooks

```tsx
import { useChat } from "@anuma/sdk/react";

const { sendMessage, isLoading, stop } = useChat({
  getToken: async () => token,
  onData: (chunk) => console.log(chunk),
});

await sendMessage({
  messages: [{ role: "user", content: [{ type: "text", text: "Hello!" }] }],
  model: "fireworks/accounts/fireworks/models/kimi-k2p5",
});
```

### API Functions

```ts
import { postApiV1Responses } from "@anuma/sdk/client";

const response = await postApiV1Responses({
  body: {
    messages: [
      { role: "user", content: [{ type: "text", text: "Hello!" }] },
    ],
    model: "fireworks/accounts/fireworks/models/kimi-k2p5",
  },
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});
```

### Platforms

The SDK provides entry points for different platforms:

- `@anuma/sdk/react` — React hooks
- `@anuma/sdk/expo` — React Native / Expo
- `@anuma/sdk/client` — Generated API client and types

## Features

The SDK gives you access to a unified API across multiple LLM providers through
a single integration. Key capabilities include:

- Streaming chat completions with tool calling and auto-execution
- Extended thinking and reasoning support
- Long-term memory with semantic search and encrypted storage
- Voice recording and transcription via Whisper
- PDF and image text extraction (OCR)
- Phone call integration
- End-to-end encryption with wallet-based key management
- Credit and subscription management

## Documentation

https://docs.anuma.ai/

## Contributing

Contributions are welcome. Please open an issue or pull request on
[GitHub](https://github.com/anuma-ai/sdk).
