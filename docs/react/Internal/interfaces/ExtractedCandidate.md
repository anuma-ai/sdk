# ExtractedCandidate

Defined in: [src/lib/memory/autoExtract.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#155)

## Properties

### confidence

> **confidence**: `number`

Defined in: [src/lib/memory/autoExtract.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#158)

***

### content

> **content**: `string`

Defined in: [src/lib/memory/autoExtract.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#156)

***

### entities

> **entities**: [`ExtractedEntity`](ExtractedEntity.md)\[]

Defined in: [src/lib/memory/autoExtract.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#160)

***

### eventTime

> **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/autoExtract.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#164)

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

Defined in: [src/lib/memory/autoExtract.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#159)

***

### type

> **type**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/memory/autoExtract.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#157)
