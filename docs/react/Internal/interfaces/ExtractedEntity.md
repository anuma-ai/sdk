# ExtractedEntity

Defined in: [src/lib/memory/autoExtract.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#166)

A named entity extracted from the conversation, with an optional
classification. `kind` is omitted when the model gave no kind or an
unrecognized one — see validateCandidates.

## Properties

### kind?

> `optional` **kind**: `"event"` | `"other"` | `"person"` | `"organization"` | `"place"` | `"product"` | `"thing"` | `"concept"`

Defined in: [src/lib/memory/autoExtract.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#168)

***

### name

> **name**: `string`

Defined in: [src/lib/memory/autoExtract.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#167)
