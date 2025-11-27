# @reverbia/sdk

A TypeScript SDK that empowers developers to build AI-powered applications. It
enables you to send prompts to LLMs with streaming support, manage long-term
memories, and encrypt sensitive data—all without needing your own LLM API key.

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

## Usage

For an example of how to use this functionality check out [the example
repo](https://github.com/zeta-chain/ai-examples).

### useChat

The `useChat` hook provides a convenient way to send chat messages to the LLM
API with automatic token management and loading state handling.

```typescript
import { useChat } from "@reverbia/sdk/react";
```

```typescript
const { sendMessage, isLoading, stop } = useChat({
  getToken: async () => identityToken || null,
  onFinish: (response) => {
    console.log("Chat finished:", response);
  },
  onError: (error) => {
    console.error("Chat error:", error);
  },
});

// Send a message
const handleSend = async () => {
  const result = await sendMessage({
    messages: [{ role: "user", content: "Hello!" }],
    model: "gpt-4o-mini",
  });

  if (result.error) {
    console.error("Error:", result.error);
  } else {
    console.log("Response:", result.data);
  }
};
```

### useMemory

The `useMemory` hook allows you to extract facts/memories from messages and
search through stored memories (in IndexedDB) using semantic search.

How it works:

1. **Fact Extraction:** When prompts are sent to the LLM, they are analyzed for
   relevant facts. If found, these facts are extracted and converted into vector
   embeddings.
2. **Storage:** Extracted memories and their embeddings are stored locally in
   IndexedDB.
3. **Retrieval:** New prompts are converted into embedding vectors and compared
   against stored memories. Relevant memories are then retrieved and used as
   context for the LLM interaction.

```typescript
import { useMemory } from "@reverbia/sdk/react";
```

```typescript
const { extractMemoriesFromMessage, searchMemories } = useMemory({
  getToken: async () => identityToken || null,
  embeddingModel: "openai/text-embedding-3-small",
});

// Example: Extract memories from a conversation
const handleExtract = async () => {
  await extractMemoriesFromMessage({
    messages: [
      { role: "user", content: "My favorite color is blue" },
      {
        role: "assistant",
        content: "I will remember that your favorite color is blue.",
      },
    ],
    model: "gpt-4o",
  });
};

// Example: Search for relevant memories
const handleSearch = async () => {
  const memories = await searchMemories("What is my favorite color?");
  console.log(memories);
};
```

### useEncryption

The `useEncryption` hook and utilities help you encrypt and decrypt local data
using a key derived from a wallet signature (requires `@privy-io/react-auth`).

```typescript
import { usePrivy } from "@privy-io/react-auth";
import { useEncryption, encryptData, decryptData } from "@reverbia/sdk/react";
```

```typescript
const { authenticated } = usePrivy();

// Initialize encryption (requests signature if key not present)
// Pass true when user is authenticated with wallet
useEncryption(authenticated);

// Encrypt data
const saveSecret = async (text: string) => {
  const encrypted = await encryptData(text);
  localStorage.setItem("secret", encrypted);
};

// Decrypt data
const loadSecret = async () => {
  const encrypted = localStorage.getItem("secret");
  if (encrypted) {
    const decrypted = await decryptData(encrypted);
    console.log(decrypted);
  }
};
```

### Direct API Access

You can also make requests to SDK functions directly without using the React
hooks.

```typescript
import { postApiV1ChatCompletions } from "@reverbia/sdk";

const response = await postApiV1ChatCompletions({
  body: {
    messages: [{ role: "user", content: "Tell me a joke" }],
    model: "gpt-4o-mini",
  },
  headers: {
    Authorization: `Bearer ${token}`, // Manually provide the token
  },
});

if (response.data) {
  console.log(response.data.choices[0].message.content);
}
```
