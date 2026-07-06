# MessageRedactionResult

Defined in: [src/lib/pii/redactor.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#62)

## Properties

### matches

> **matches**: [`PiiMatch`](PiiMatch.md)\[]

Defined in: [src/lib/pii/redactor.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#66)

All matches found across all messages.

***

### messages

> **messages**: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/pii/redactor.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#64)

Redacted messages (new array — originals are not mutated).
