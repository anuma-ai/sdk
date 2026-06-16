# ExtractedCandidate

Defined in: [src/lib/memory/autoExtract.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#102)

## Properties

### confidence

> **confidence**: `number`

Defined in: [src/lib/memory/autoExtract.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#105)

***

### content

> **content**: `string`

Defined in: [src/lib/memory/autoExtract.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#103)

***

### entities

> **entities**: `string`\[]

Defined in: [src/lib/memory/autoExtract.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#107)

***

### eventTime

> **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/autoExtract.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#111)

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

Defined in: [src/lib/memory/autoExtract.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#106)

***

### type

> **type**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/memory/autoExtract.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#104)
