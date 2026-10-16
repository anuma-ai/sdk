# ExtractedEntity

Defined in: [src/lib/memory/autoExtract.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#133)

A named entity extracted from the conversation, with an optional
classification. `kind` is omitted when the model gave no kind or an
unrecognized one — see validateCandidates.

## Properties

### kind?

> `optional` **kind**: `"event"` | `"person"` | `"organization"` | `"place"` | `"product"` | `"thing"` | `"concept"` | `"other"`

Defined in: [src/lib/memory/autoExtract.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#135)

***

### name

> **name**: `string`

Defined in: [src/lib/memory/autoExtract.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#134)

***

### weight?

> `optional` **weight**: `number`

Defined in: [src/lib/memory/autoExtract.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#136)
