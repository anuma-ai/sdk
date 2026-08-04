# DecayPolicy

Defined in: [src/lib/memory/decay.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#79)

Per-type TTL + window overrides. Pass a partial to [classifyDecay](../functions/classifyDecay.md) /
the sweeper to tune behavior (evaluation harnesses, tests). Anything omitted
falls back to [DEFAULT\_DECAY\_POLICY](../variables/DEFAULT_DECAY_POLICY.md).

## Properties

### fallbackTtlMs

> **fallbackTtlMs**: `number`

Defined in: [src/lib/memory/decay.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#86)

TTL for `null` / unknown fact types (the medium bucket).

***

### hardDeleteWindowMs

> **hardDeleteWindowMs**: `number`

Defined in: [src/lib/memory/decay.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#88)

How long an archived row lingers before hard delete.

***

### pastEventGraceMs

> **pastEventGraceMs**: `number`

Defined in: [src/lib/memory/decay.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#90)

Grace after a past `event_time_end` before archiving a plan/ongoing.

***

### ttlByType

> **ttlByType**: `Record`<`string`, `number`>

Defined in: [src/lib/memory/decay.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#84)

Age TTL (ms since `updatedAt`) per FactType. A type absent from this map —
or a null/unknown `factType` — uses [DecayPolicy.fallbackTtlMs](#fallbackttlms).
