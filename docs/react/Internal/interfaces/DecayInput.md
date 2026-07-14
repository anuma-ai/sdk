# DecayInput

Defined in: [src/lib/memory/decay.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#96)

The minimal plaintext shape [classifyDecay](../functions/classifyDecay.md) reads. Deliberately excludes
`content` (encrypted; never touched by decay) — the sweep selects exactly
these columns so it stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/memory/decay.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#114)

Unix ms when archived, or null when active.

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memory/decay.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#108)

W6 temporal lane — Unix ms the event ended (range/ongoing), or null.

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#110)

W6 temporal lane — `point | range | ongoing | null`.

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#106)

The extractor's FactType, or null (legacy/manual/untyped → medium bucket).

***

### id?

> `optional` **id**: `string`

Defined in: [src/lib/memory/decay.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#104)

The row's stable id. Not read by the rule engine ([classifyDecay](../functions/classifyDecay.md)
ignores it) — it is threaded through so an optional content-reading decay
classifier (PR5, [createLlmDecayClassifier](../functions/createLlmDecayClassifier.md)) can fetch + decrypt the
row for a borderline verdict. Optional so pure rule-based callers/tests can
omit it.

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#116)

`manual` | `auto-extracted` | `capsule` | null. Manual is never decayed.

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/memory/decay.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#112)

Unix ms of the row's last write (re-observation resets this).
