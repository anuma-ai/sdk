# DecayInput

Defined in: [src/lib/memory/decay.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#79)

The minimal plaintext shape [classifyDecay](../functions/classifyDecay.md) reads. Deliberately excludes
`content` (encrypted; never touched by decay) — the sweep selects exactly
these columns so it stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/memory/decay.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#99)

Unix ms when archived, or null when active.

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memory/decay.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#91)

W6 temporal lane — Unix ms the event ended (range/ongoing), or null.

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#93)

W6 temporal lane — `point | range | ongoing | null`.

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#89)

The extractor's FactType, or null (legacy/manual/untyped → medium bucket).

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memory/decay.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#87)

The row's stable id. Not read by the rule engine ([classifyDecay](../functions/classifyDecay.md)
ignores it) — it is threaded through so an optional content-reading decay
classifier (PR5, [createLlmDecayClassifier](../functions/createLlmDecayClassifier.md)) can fetch + decrypt the
row for a borderline verdict. Optional so pure rule-based callers/tests can
omit it.

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memory/decay.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#97)

Last distinct observation; does not change the edit timestamp.

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#101)

`manual` | `auto-extracted` | `capsule` | null. Manual is never decayed.

***

### trustTier?

> `optional` **trustTier**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#110)

`trusted` | `quarantined` | null. Not read by the rule engine
([classifyDecay](../functions/classifyDecay.md) ignores it — quarantined rows still age/archive/delete
by RULE). It exists only so the sweeper's `isBorderline` can keep a
quarantined (injection-screened) row away from the optional content-reading
classifier, so poison content never egresses. Optional so pure rule-based
callers/tests can omit it (treated as not quarantined).

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/memory/decay.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#95)

Unix ms of the row's last write (re-observation resets this).
