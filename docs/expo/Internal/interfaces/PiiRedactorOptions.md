# PiiRedactorOptions

Defined in: [src/lib/pii/redactor.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#26)

Options for constructing a [PiiRedactor](../classes/PiiRedactor.md). Lets apps disable noisy
built-in categories or supply their own detection patterns.

## Properties

### excludeCategories?

> `optional` **excludeCategories**: (`string` & `object` | [`PiiCategory`](../type-aliases/PiiCategory.md))\[]

Defined in: [src/lib/pii/redactor.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#42)

Built-in categories to disable, e.g. the higher-false-positive
`["US_ADDRESS", "DATE_OF_BIRTH"]`. Ignored when `patterns` is provided.

***

### extraPatterns?

> `optional` **extraPatterns**: [`PiiPattern`](PiiPattern.md)\[]

Defined in: [src/lib/pii/redactor.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#37)

Additional patterns appended after the (optionally filtered) built-ins.
Ignored when `patterns` is provided.

***

### nerDetector?

> `optional` **nerDetector**: `NerDetector`

Defined in: [src/lib/pii/redactor.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#52)

Optional named-entity detector for *unstructured* PII (person names,
locations, organizations) that regex cannot find. When supplied, the
**async** redaction methods (`redactTextAsync` / `maskTextAsync` /
`redactMessagesAsync`) merge its spans with the regex matches; the
synchronous methods ignore it and stay regex-only. The regex layer always
wins on overlap, so structured PII detection stays deterministic. See
NerDetector.

***

### patterns?

> `optional` **patterns**: [`PiiPattern`](PiiPattern.md)\[]

Defined in: [src/lib/pii/redactor.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#32)

Replace the entire default pattern set. When set, `extraPatterns` and
`excludeCategories` are ignored. Order matters — more specific patterns
should come first (see [PII\_PATTERNS](../variables/PII_PATTERNS.md)).
