# QuarantinedMemoryInfo

Defined in: [src/lib/memory/autoExtract.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#161)

Tier-0 security (PR3) — describes a candidate the injection screen
quarantined and persisted as an audit row. The client uses this to surface
a "held for review" state. `content` lives on `candidate` (same exposure as
[ExtractedCandidate](ExtractedCandidate.md)); never log it.

## Extended by

* [`MemoryQuarantinedEvent`](MemoryQuarantinedEvent.md)

## Properties

### candidate

> **candidate**: [`ExtractedCandidate`](ExtractedCandidate.md)

Defined in: [src/lib/memory/autoExtract.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#162)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/autoExtract.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#164)

The persisted (quarantined) memory row id.

***

### reason

> **reason**: [`InjectionReason`](../type-aliases/InjectionReason.md)

Defined in: [src/lib/memory/autoExtract.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#166)

Coarse reason bucket from the screen.

***

### signature

> **signature**: `string`

Defined in: [src/lib/memory/autoExtract.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#168)

Stable signature id that matched (safe to log; carries no content).
