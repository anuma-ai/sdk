# ProfileDoc

Defined in: [src/lib/memory/synthesizeProfile.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#230)

A synthesized profile. Server-authoritative once published; the client
caches it and passes it back as [SynthesizeProfileOptions.previous](SynthesizeProfileOptions.md#previous).

## Properties

### config

> **config**: [`ProfileConfigFingerprint`](ProfileConfigFingerprint.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#240)

The config that produced this doc — see [ProfileConfigFingerprint](ProfileConfigFingerprint.md).

***

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#254)

Unix ms this doc was produced.

***

### observationTrends

> **observationTrends**: `Record`<[`ObservationTrend`](../type-aliases/ObservationTrend.md), `number`>

Defined in: [src/lib/memory/synthesizeProfile.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#246)

C2 — counts of observation-trend labels over live vault facts at
synthesis time. Lets People Nearby surface "interests trending up"
without another LLM pass. Recomputed every synthesis (not delta-cached).

***

### sections

> **sections**: [`ProfileSection`](ProfileSection.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#234)

One section per requested facet (in facet order).

***

### unreadableMemoryIds?

> `optional` **unreadableMemoryIds**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#252)

Sorted ids the store listed but could not decrypt at synthesis time.
Absent when every memory was readable. A later call regenerates only when
this set changes, and attributes a memory once it becomes readable.

***

### vaultWatermark

> **vaultWatermark**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#238)

Max change-time across all vault facts (incl. deleted/superseded) at
synthesis time. Delta refresh regenerates only sections whose source facts
changed since a previous doc's watermark.

***

### version

> **version**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#232)

[PROFILE\_DOC\_VERSION](../variables/PROFILE_DOC_VERSION.md) at synthesis time.
