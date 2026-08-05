# ExtractedCandidate

Defined in: [src/lib/memory/autoExtract.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#190)

## Properties

### confidence

> **confidence**: `number`

Defined in: [src/lib/memory/autoExtract.ts:193](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#193)

***

### content

> **content**: `string`

Defined in: [src/lib/memory/autoExtract.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#191)

***

### entities

> **entities**: [`ExtractedEntity`](ExtractedEntity.md)\[]

Defined in: [src/lib/memory/autoExtract.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#195)

***

### eventTime

> **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/autoExtract.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#199)

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

### facetKey

> **facetKey**: `string` | `null`

Defined in: [src/lib/memory/autoExtract.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#214)

Facet slot key (v43) — the closed `"<factType>:self:<slot>"` key of a
single-valued SELF standing attribute, or null. Built in
validateCandidates ONLY when the model's `facetSlot` is in
[FACET\_SLOTS](../variables/FACET_SLOTS.md) AND `facetValue` is non-empty; off-enum / list-valued /
dated facts stay null (both null together). Forwarded to retain(), which
records it on the created row — it does not drive dedup.

***

### facetValue

> **facetValue**: `string` | `null`

Defined in: [src/lib/memory/autoExtract.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#217)

Facet value (v43) — the normalized lowercase value token for
[facetKey](#facetkey) (e.g. "dark"/"light"), or null. Paired with facetKey.

***

### sourceMessageIds

> **sourceMessageIds**: `string`\[]

Defined in: [src/lib/memory/autoExtract.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#194)

***

### type

> **type**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/memory/autoExtract.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#192)
