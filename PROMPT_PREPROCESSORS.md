# Prompt Pre-Processors

## Introduction

Prompt pre-processors run after the last user message is received but before the first LLM request. Each pre-processor receives the prompt text and a single shared embedding (computed once per request) and can return additional messages to enrich the conversation before it reaches the model.

Typical uses:

- **Classify-then-fetch flows.** Decide whether the prompt needs external data (web search, weather, stocks), fetch it, and inject the result as context.
- **Retrieval augmentation.** Vector-search a knowledge base with the shared embedding and prepend relevant snippets.
- **Rule-based context injection.** Detect specific patterns and add disclaimers, metadata, or tool hints.

Because every pre-processor gets the same embedding, adding a second or third one costs only a cosine comparison — not a new embedding round-trip.

## Flow

```mermaid
flowchart TD
    Start[User sends prompt] --> Embed[Embed last user message once]
    Embed --> Parallel{Run all pre-processors in parallel}
    Parallel --> P1[Pre-processor 1]
    Parallel --> P2[Pre-processor 2]
    Parallel --> Pn[Pre-processor N]
    P1 -->|LlmapiMessage[] or nothing| Collect[Flatten + append to messages]
    P2 -->|LlmapiMessage[] or nothing| Collect
    Pn -->|LlmapiMessage[] or nothing| Collect
    Collect --> LLM[Send enriched conversation to LLM]
```

- The embedding call happens **once per `runToolLoop` call**, then is shared across every pre-processor in the array.
- Pre-processors run **in parallel** (`Promise.all`) — they are assumed independent.
- **Per-processor errors are isolated.** A throw in one pre-processor is logged to `console.warn` and the others still run.
- Messages returned by each pre-processor are appended **in array order** to `messages`, so later pre-processors can see (but not yet see returned messages from) earlier ones. If ordering matters, run them as a single pre-processor internally.
- **Classifier stage errors (e.g. embedding endpoint down) are non-fatal.** The LLM request proceeds without enrichment.

## API

```ts
type PromptPreProcessor = (ctx: {
  prompt: string;        // last user message text
  embedding: number[];   // computed once, shared across all pre-processors
  signal?: AbortSignal;
}) => LlmapiMessage[] | void | Promise<LlmapiMessage[] | void>;

runToolLoop({
  messages,
  model,
  token,
  preProcessors: [/* array of PromptPreProcessor */],
});
```

Return an array of messages to append them to the conversation, or return `void` / `undefined` to leave the conversation unchanged.

## Built-in: `createWebSearchPreProcessor`

The SDK ships the web-search classifier as a concrete pre-processor. It does **not** run the search itself — the caller supplies a search provider. The classifier decides whether a search is worth running; if yes, the caller's provider is invoked and results are injected.

### Basic usage

```ts
import { runToolLoop, createWebSearchPreProcessor } from "@anuma/sdk/server";

const webSearch = createWebSearchPreProcessor({
  fetchSearchResults: async (prompt, { signal }) => {
    const res = await mySearchProvider.query(prompt, { signal });
    return res.results.map((r) => `- ${r.title}: ${r.snippet}`).join("\n");
  },
});

await runToolLoop({
  messages,
  model,
  token,
  preProcessors: [webSearch],
});
```

When `fetchSearchResults` returns a string, the SDK wraps it in a user-role message with the prefix `Web search context:\n…`. Return an `LlmapiMessage[]` directly if you need full control over role or content shape.

### Observer mode

Omit `fetchSearchResults` to only observe the classification — useful for A/B tests and metrics without yet wiring up a provider.

```ts
const observer = createWebSearchPreProcessor({
  onClassification: ({ needsWebSearch, searchScore, noSearchScore }) => {
    metrics.record({ needsWebSearch, searchScore, noSearchScore });
  },
});
```

### Tuning

- **`margin`** — how much `searchScore` must exceed `noSearchScore` to trigger. Defaults to `0.02`. Raise to reduce false positives; lower to reduce false negatives.
- **`onClassification`** — fires on every classification regardless of whether `fetchSearchResults` runs. Use it for observability even when the provider is wired up.

## Low-level: `classifyWebSearch`

If you need classification outside of `runToolLoop` (e.g. to route requests before ever calling the tool loop), use the standalone API:

```ts
import { classifyWebSearch } from "@anuma/sdk/server";

const { needsWebSearch, searchScore, noSearchScore } = await classifyWebSearch(
  prompt,
  { apiKey, baseUrl },
);
```

`classifyWebSearchBatch` accepts an array of prompts and embeds them in a single batch call.

## Writing a custom pre-processor

Any function matching `PromptPreProcessor` works. Example: inject memory-vault search results for every prompt above a similarity threshold.

```ts
const vaultContext: PromptPreProcessor = async ({ prompt, embedding }) => {
  const hits = await searchVault(embedding, { topK: 3, minScore: 0.75 });
  if (hits.length === 0) return;
  return [
    {
      role: "user",
      content: [
        { type: "text", text: `Relevant memories:\n${hits.map((h) => `- ${h.text}`).join("\n")}` },
      ],
    },
  ];
};

await runToolLoop({
  messages,
  model,
  token,
  preProcessors: [vaultContext, webSearch],
});
```
