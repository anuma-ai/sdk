# ExtractedEntity

Defined in: [src/lib/memory/autoExtract.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#110)

A named entity extracted from the conversation, with an optional
classification. `kind` is omitted when the model gave no kind or an
unrecognized one — see validateCandidates.

## Properties

### kind?

> `optional` **kind**: `"other"` | `"person"` | `"place"` | `"thing"` | `"concept"`

Defined in: [src/lib/memory/autoExtract.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#112)

***

### name

> **name**: `string`

Defined in: [src/lib/memory/autoExtract.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#111)
