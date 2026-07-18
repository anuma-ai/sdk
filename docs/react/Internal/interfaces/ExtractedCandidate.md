# ExtractedCandidate

Defined in: [src/lib/memory/autoExtract.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#171)

## Properties

### confidence

> **confidence**: `number`

Defined in: [src/lib/memory/autoExtract.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#174)

***

### content

> **content**: `string`

Defined in: [src/lib/memory/autoExtract.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#172)

***

### entities

> **entities**: [`ExtractedEntity`](ExtractedEntity.md)\[]

Defined in: [src/lib/memory/autoExtract.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#176)

***

### eventTime

> **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/autoExtract.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#180)

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

Defined in: [src/lib/memory/autoExtract.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#175)

***

### type

> **type**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/memory/autoExtract.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#173)
