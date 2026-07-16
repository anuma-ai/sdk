# ExtractedCandidate

Defined in: [src/lib/memory/autoExtract.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#166)

## Properties

### confidence

> **confidence**: `number`

Defined in: [src/lib/memory/autoExtract.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#169)

***

### content

> **content**: `string`

Defined in: [src/lib/memory/autoExtract.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#167)

***

### entities

> **entities**: [`ExtractedEntity`](ExtractedEntity.md)\[]

Defined in: [src/lib/memory/autoExtract.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#171)

***

### eventTime

> **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/autoExtract.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#175)

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

Defined in: [src/lib/memory/autoExtract.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#170)

***

### type

> **type**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/memory/autoExtract.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#168)
