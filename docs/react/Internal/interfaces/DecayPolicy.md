# DecayPolicy

Defined in: src/lib/memory/decay.ts:55

Per-type TTL + window overrides. Pass a partial to [classifyDecay](../functions/classifyDecay.md) /
the sweeper to tune behavior (evaluation harnesses, tests). Anything omitted
falls back to [DEFAULT\_DECAY\_POLICY](../variables/DEFAULT_DECAY_POLICY.md).

## Properties

### fallbackTtlMs

> **fallbackTtlMs**: `number`

Defined in: src/lib/memory/decay.ts:62

TTL for `null` / unknown fact types (the medium bucket).

***

### hardDeleteWindowMs

> **hardDeleteWindowMs**: `number`

Defined in: src/lib/memory/decay.ts:64

How long an archived row lingers before hard delete.

***

### pastEventGraceMs

> **pastEventGraceMs**: `number`

Defined in: src/lib/memory/decay.ts:66

Grace after a past `event_time_end` before archiving a plan/ongoing.

***

### ttlByType

> **ttlByType**: `Record`<`string`, `number`>

Defined in: src/lib/memory/decay.ts:60

Age TTL (ms since `updatedAt`) per FactType. A type absent from this map —
or a null/unknown `factType` — uses [DecayPolicy.fallbackTtlMs](#fallbackttlms).
