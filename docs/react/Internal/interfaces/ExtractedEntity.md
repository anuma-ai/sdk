# ExtractedEntity

Defined in: [src/lib/memory/autoExtract.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#145)

A named entity extracted from the conversation, with an optional
classification. `kind` is omitted when the model gave no kind or an
unrecognized one — see validateCandidates.

## Properties

### kind?

> `optional` **kind**: `"other"` | `"person"` | `"place"` | `"thing"` | `"concept"`

Defined in: [src/lib/memory/autoExtract.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#147)

***

### name

> **name**: `string`

Defined in: [src/lib/memory/autoExtract.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#146)
