# DecayInput

Defined in: [src/lib/memory/decay.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#96)

The minimal plaintext shape [classifyDecay](../functions/classifyDecay.md) reads. Deliberately excludes
`content` (encrypted; never touched by decay) — the sweep selects exactly
these columns so it stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/memory/decay.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#106)

Unix ms when archived, or null when active.

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memory/decay.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#100)

W6 temporal lane — Unix ms the event ended (range/ongoing), or null.

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#102)

W6 temporal lane — `point | range | ongoing | null`.

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#98)

The extractor's FactType, or null (legacy/manual/untyped → medium bucket).

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#108)

`manual` | `auto-extracted` | `capsule` | null. Manual is never decayed.

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/memory/decay.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#104)

Unix ms of the row's last write (re-observation resets this).
