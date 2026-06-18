# PII Redaction

## Introduction

PII redaction is a **best-effort, client-side** layer that scans outbound
message text for personally identifiable information and replaces matches with
tagged placeholders (`[EMAIL_1]`, `[PHONE_2]`, …) before the request leaves the
device. The model only ever sees the placeholders; the SDK restores the
original values in the response — in both the live stream and the final result —
so the user always sees real data.

> **This is obfuscation, not a compliance guarantee.** Detection is regex-based.
> It can miss real PII and over-match ordinary text, it does not detect names,
> and it does not cover non-text content (images, file uploads, attachments) or
> model-generated tool-call arguments. Treat it as defense-in-depth, not as a
> control you can rely on for regulatory purposes.

## What is covered

- **All message-role text** sent to the provider — user, system, assistant
  history, and tool results on continuation rounds.
- **Injected pre-processor context** (memory/search/file snippets).
- **Embedding inputs** in `useChatStorage` (message vectors, tool-filter
  prompts) — only the text sent to the embeddings endpoint is redacted; the
  text stored locally stays original.
- **The summarization prompt** — redacted before the summary model call, and the
  returned summary is de-anonymized before it is stored/injected.

## What is **not** covered

- Names and other free-form identifiers (no regex for them).
- Non-text content: images, base64/file uploads, file URLs, filenames. A
  one-time `console.warn` is emitted when such content is present.
- Model-generated tool-call arguments (the model only ever saw placeholders, so
  these contain placeholders rather than raw PII — but they are not restored
  before local tool execution).
- `expo/useChatStorage` does not yet support `piiRedaction`.

## Built-in categories

`EMAIL`, `PHONE` (US formats + E.164), `SSN` (dashed, plus dashless/spaced when an
"SSN"/"social security" cue is nearby), `CREDIT_CARD` (Luhn-validated),
`IP_ADDRESS` (IPv4 + IPv6), `API_KEY` (entropy-validated), `US_ADDRESS`, and
`DATE_OF_BIRTH` (only with a "DOB"/"born"/"birthday" cue and a valid calendar
date).

## Usage

### Hooks

```ts
const { sendMessage } = useChat({
  getToken,
  piiRedaction: true, // one redactor shared across turns for this hook
  onPiiRedacted: (matches) => {
    // e.g. show "redacted 2 emails, 1 SSN" for user consent
    console.log(matches.map((m) => m.category));
  },
});
```

In `useChatStorage`, `piiRedaction: true` keeps one redactor **per conversation**
(reset when you switch conversations). You can also disable redaction for a
single request:

```ts
await sendMessage({ messages, piiRedaction: false });
```

### Custom configuration

Pass a `PiiRedactor` instance to bring your own state or tune detection:

```ts
import { PiiRedactor } from "@anuma/sdk";

const redactor = new PiiRedactor({
  // Drop the higher-false-positive categories
  excludeCategories: ["US_ADDRESS", "DATE_OF_BIRTH"],
  // Add your own detectors (custom categories get their own placeholder tag)
  extraPatterns: [{ category: "EMPLOYEE_ID", regex: /\bEMP-\d{6}\b/g }],
});

const { sendMessage } = useChat({ getToken, piiRedaction: redactor });
```

### Direct (server / Node)

```ts
import { runToolLoop, PiiRedactor } from "@anuma/sdk/server";

const redactor = new PiiRedactor();
await runToolLoop({
  messages,
  model,
  getToken,
  piiRedaction: redactor, // reuse across calls in the same conversation
  onData: (chunk) => process.stdout.write(chunk), // already de-anonymized
});
```

## How it works

1. Outbound message text is redacted with a stateful `PiiRedactor`, which maps
   each distinct value to a stable placeholder.
2. The redacted request is sent to the provider.
3. The streamed response is de-anonymized through a buffering de-anonymizer that
   correctly restores placeholders even when they are split across stream
   chunks.
4. The final response and the persisted assistant message are de-anonymized too,
   so live and stored views match. Because original values are stored locally,
   every outbound turn re-redacts the full history with the same per-conversation
   redactor, keeping placeholders consistent.

## API

```ts
type PiiCategory =
  | "EMAIL" | "PHONE" | "SSN" | "CREDIT_CARD"
  | "IP_ADDRESS" | "API_KEY" | "US_ADDRESS" | "DATE_OF_BIRTH";

interface PiiRedactorOptions {
  patterns?: PiiPattern[];          // replace the entire default set
  extraPatterns?: PiiPattern[];     // append custom detectors
  excludeCategories?: string[];     // disable built-in categories
}

class PiiRedactor {
  constructor(options?: PiiRedactorOptions);
  redactText(text: string): { text: string; matches: PiiMatch[] };
  redactMessages(messages: LlmapiMessage[]): { messages: LlmapiMessage[]; matches: PiiMatch[] };
  deAnonymize(text: string): string;
  getMappings(): ReadonlyMap<string, string>; // placeholder -> original (snapshot)
  clear(): void;
  get size(): number;
}
```
