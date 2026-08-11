# ExtractedCandidate

Defined in: [src/lib/memory/autoExtract.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#181)

## Properties

### confidence

> **confidence**: `number`

Defined in: [src/lib/memory/autoExtract.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#184)

***

### content

> **content**: `string`

Defined in: [src/lib/memory/autoExtract.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#182)

***

### entities

> **entities**: [`ExtractedEntity`](ExtractedEntity.md)\[]

Defined in: [src/lib/memory/autoExtract.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#186)

***

### eventTime

> **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/autoExtract.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#190)

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

Defined in: [src/lib/memory/autoExtract.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#185)

***

### type

> **type**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/memory/autoExtract.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#183)
