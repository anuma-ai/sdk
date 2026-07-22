# ExtractedEntity

Defined in: [src/lib/memory/autoExtract.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#171)

A named entity extracted from the conversation, with an optional
classification. `kind` is omitted when the model gave no kind or an
unrecognized one — see validateCandidates.

## Properties

### kind?

> `optional` **kind**: `"event"` | `"other"` | `"person"` | `"organization"` | `"place"` | `"product"` | `"thing"` | `"concept"`

Defined in: [src/lib/memory/autoExtract.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#173)

***

### name

> **name**: `string`

Defined in: [src/lib/memory/autoExtract.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#172)
