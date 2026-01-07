# @reverbia/sdk

A TypeScript SDK that empowers developers to build AI-powered applications. It
enables you to send prompts to LLMs with streaming support, manage long-term
memories, and encrypt sensitive data, all without needing your own LLM API key.

## Installation

```bash
pnpm install @reverbia/sdk@next
```

> **Note:** Currently, the SDK is pre-release so all new versions are released
> under the `next` tag (released on every merge to the `main` branch). Check out
> npm to see the latest version.

## Configuration

To use the SDK, you'll need to configure your Privy provider and API URL.

```env
PRIVY_APP_ID=cmhwlx82v000xle0cde4rjy5y
API_URL=https://ai-portal-dev.zetachain.com
```

## Authentication

The SDK currently only supports authentication via [Privy](https://privy.io) and
expects a Privy identity token.

```typescript
import { useIdentityToken } from "@privy-io/react-auth";

const { identityToken } = useIdentityToken();
```

## Quick Start

For React applications, use the hooks from `@reverbia/sdk/react`:

```typescript
import { useChat } from "@reverbia/sdk/react";

const { sendMessage, isLoading, stop } = useChat({
  getToken: async () => identityToken || null,
  onFinish: (response) => console.log("Chat finished:", response),
  onError: (error) => console.error("Chat error:", error),
  onData: (chunk) => console.log("Received chunk:", chunk),
});

await sendMessage({
  messages: [{ role: "user", content: [{ type: "text", text: "Hello!" }] }],
  model: "gpt-4o-mini",
});
```

For React Native/Expo, use `@reverbia/sdk/expo` instead.

For direct API access without React hooks, use the functions from this package:

```typescript
import { postApiV1Responses } from "@reverbia/sdk";

const response = await postApiV1Responses({
  body: {
    messages: [
      { role: "user", content: [{ type: "text", text: "Tell me a joke" }] },
    ],
    model: "gpt-4o-mini",
  },
  headers: {
    Authorization: `Bearer ${identityToken}`,
  },
});
```

## What's Included

The SDK provides everything you need to integrate AI capabilities into your
applications:

- **Chat completions** with streaming support and tool calling
- **Image generation** from text prompts
- **Text embeddings** for semantic search
- **Web search** integration
- **PDF and image text extraction** (OCR)
- **Memory and context management** for conversational AI
- **Wallet-based encryption** for secure data storage

## Documentation

https://ai-docs.zetachain.app

## Example Usage

For a complete example of how to use this SDK, check out [the example
repo](https://github.com/zeta-chain/ai-examples).

