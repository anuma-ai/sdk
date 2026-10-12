# MessageRedactionResult

Defined in: [src/lib/pii/redactor.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#51)

## Properties

### matches

> **matches**: [`PiiMatch`](PiiMatch.md)\[]

Defined in: [src/lib/pii/redactor.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#55)

All matches found across all messages.

***

### messages

> **messages**: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/pii/redactor.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#53)

Redacted messages (new array — originals are not mutated).
