# MemoryQuarantinedEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#87)

Tier-0 security (PR3) — fired once per candidate the injection screen
quarantined and persisted as an audit row. Distinct from
[MemoryExtractedEvent](MemoryExtractedEvent.md) so a client can render "held for review"
without treating a poisoned fact as a normal saved memory.

## Extends

* [`QuarantinedMemoryInfo`](QuarantinedMemoryInfo.md)

## Properties

### candidate

> **candidate**: [`ExtractedCandidate`](ExtractedCandidate.md)

Defined in: [src/lib/memory/autoExtract.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#202)

**Inherited from**

[`QuarantinedMemoryInfo`](QuarantinedMemoryInfo.md).[`candidate`](QuarantinedMemoryInfo.md#candidate)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#88)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/autoExtract.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#204)

The persisted (quarantined) memory row id.

**Inherited from**

[`QuarantinedMemoryInfo`](QuarantinedMemoryInfo.md).[`memoryId`](QuarantinedMemoryInfo.md#memoryid)

***

### reason

> **reason**: [`InjectionReason`](../type-aliases/InjectionReason.md)

Defined in: [src/lib/memory/autoExtract.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#206)

Coarse reason bucket from the screen.

**Inherited from**

[`QuarantinedMemoryInfo`](QuarantinedMemoryInfo.md).[`reason`](QuarantinedMemoryInfo.md#reason)

***

### signature

> **signature**: `string`

Defined in: [src/lib/memory/autoExtract.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#208)

Stable signature id that matched (safe to log; carries no content).

**Inherited from**

[`QuarantinedMemoryInfo`](QuarantinedMemoryInfo.md).[`signature`](QuarantinedMemoryInfo.md#signature)
