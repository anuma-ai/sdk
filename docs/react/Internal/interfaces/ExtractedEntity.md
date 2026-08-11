# ExtractedEntity

Defined in: [src/lib/memory/autoExtract.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#176)

A named entity extracted from the conversation, with an optional
classification. `kind` is omitted when the model gave no kind or an
unrecognized one — see validateCandidates.

## Properties

### kind?

> `optional` **kind**: `"event"` | `"other"` | `"person"` | `"organization"` | `"place"` | `"product"` | `"thing"` | `"concept"`

Defined in: [src/lib/memory/autoExtract.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#178)

***

### name

> **name**: `string`

Defined in: [src/lib/memory/autoExtract.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#177)
