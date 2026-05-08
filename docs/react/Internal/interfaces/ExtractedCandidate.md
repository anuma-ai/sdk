# ExtractedCandidate

Defined in: [src/lib/memory/autoExtract.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#82)

## Properties

### confidence

> **confidence**: `number`

Defined in: [src/lib/memory/autoExtract.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#85)

***

### content

> **content**: `string`

Defined in: [src/lib/memory/autoExtract.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#83)

***

### entities

> **entities**: `string`\[]

Defined in: [src/lib/memory/autoExtract.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#87)

***

### eventTime

> **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/autoExtract.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#91)

W6 temporal lane — when the event in this fact occurred. Resolved
to absolute timestamps by the LLM; null when the fact has no
temporal anchor.

**Type Declaration**

{ `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; }

**end**

> **end**: `number` | `null`

Unix ms timestamp of the event end. Only set when kind='range'.

**kind**

> **kind**: `"point"` | `"range"` | `"ongoing"`

**start**

> **start**: `number`

Unix ms timestamp of the event start (or point).

`null`

***

### sourceMessageIds

> **sourceMessageIds**: `string`\[]

Defined in: [src/lib/memory/autoExtract.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#86)

***

### type

> **type**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/memory/autoExtract.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#84)
