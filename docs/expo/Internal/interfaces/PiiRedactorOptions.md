# PiiRedactorOptions

Defined in: [src/lib/pii/redactor.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#25)

Options for constructing a [PiiRedactor](../classes/PiiRedactor.md). Lets apps disable noisy
built-in categories or supply their own detection patterns.

## Properties

### excludeCategories?

> `optional` **excludeCategories**: (`string` & `object` | [`PiiCategory`](../type-aliases/PiiCategory.md))\[]

Defined in: [src/lib/pii/redactor.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#41)

Built-in categories to disable, e.g. the higher-false-positive
`["US_ADDRESS", "DATE_OF_BIRTH"]`. Ignored when `patterns` is provided.

***

### extraPatterns?

> `optional` **extraPatterns**: [`PiiPattern`](PiiPattern.md)\[]

Defined in: [src/lib/pii/redactor.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#36)

Additional patterns appended after the (optionally filtered) built-ins.
Ignored when `patterns` is provided.

***

### patterns?

> `optional` **patterns**: [`PiiPattern`](PiiPattern.md)\[]

Defined in: [src/lib/pii/redactor.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#31)

Replace the entire default pattern set. When set, `extraPatterns` and
`excludeCategories` are ignored. Order matters — more specific patterns
should come first (see [PII\_PATTERNS](../variables/PII_PATTERNS.md)).
