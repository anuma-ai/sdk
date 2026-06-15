# ExtractedCandidate

Defined in: [src/lib/memory/autoExtract.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#92)

## Properties

### confidence

> **confidence**: `number`

Defined in: [src/lib/memory/autoExtract.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#95)

***

### content

> **content**: `string`

Defined in: [src/lib/memory/autoExtract.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#93)

***

### entities

> **entities**: `string`\[]

Defined in: [src/lib/memory/autoExtract.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#97)

***

### eventTime

> **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/autoExtract.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#101)

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

Defined in: [src/lib/memory/autoExtract.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#96)

***

### type

> **type**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/memory/autoExtract.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#94)
