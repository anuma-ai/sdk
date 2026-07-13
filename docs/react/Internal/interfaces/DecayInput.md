# DecayInput

Defined in: [src/lib/memory/decay.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#90)

The minimal plaintext shape [classifyDecay](../functions/classifyDecay.md) reads. Deliberately excludes
`content` (encrypted; never touched by decay) — the sweep selects exactly
these columns so it stays zero-knowledge.

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/memory/decay.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#100)

Unix ms when archived, or null when active.

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memory/decay.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#94)

W6 temporal lane — Unix ms the event ended (range/ongoing), or null.

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#96)

W6 temporal lane — `point | range | ongoing | null`.

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#92)

The extractor's FactType, or null (legacy/manual/untyped → medium bucket).

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/memory/decay.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#102)

`manual` | `auto-extracted` | `capsule` | null. Manual is never decayed.

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/lib/memory/decay.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#98)

Unix ms of the row's last write (re-observation resets this).
