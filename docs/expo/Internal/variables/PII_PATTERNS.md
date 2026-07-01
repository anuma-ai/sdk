# PII\_PATTERNS

> `const` **PII\_PATTERNS**: [`PiiPattern`](../interfaces/PiiPattern.md)\[]

Defined in: [src/lib/pii/patterns.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/patterns.ts#64)

Pattern order matters: more specific patterns run before less specific ones
to prevent greedy matches. For example, SSN (###-##-####) must run before
phone, and IP addresses (dotted quads) must run before phone.
