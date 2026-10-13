# ProfileDoc

Defined in: [src/lib/memory/synthesizeProfile.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#229)

A synthesized profile. Server-authoritative once published; the client
caches it and passes it back as [SynthesizeProfileOptions.previous](SynthesizeProfileOptions.md#previous).

## Properties

### config

> **config**: [`ProfileConfigFingerprint`](ProfileConfigFingerprint.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#239)

The config that produced this doc — see [ProfileConfigFingerprint](ProfileConfigFingerprint.md).

***

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:253](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#253)

Unix ms this doc was produced.

***

### observationTrends

> **observationTrends**: `Record`<[`ObservationTrend`](../type-aliases/ObservationTrend.md), `number`>

Defined in: [src/lib/memory/synthesizeProfile.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#245)

C2 — counts of observation-trend labels over live vault facts at
synthesis time. Lets People Nearby surface "interests trending up"
without another LLM pass. Recomputed every synthesis (not delta-cached).

***

### sections

> **sections**: [`ProfileSection`](ProfileSection.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#233)

One section per requested facet (in facet order).

***

### unreadableMemoryIds?

> `optional` **unreadableMemoryIds**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#251)

Sorted ids the store listed but could not decrypt at synthesis time.
Absent when every memory was readable. A later call regenerates only when
this set changes, and attributes a memory once it becomes readable.

***

### vaultWatermark

> **vaultWatermark**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:237](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#237)

Max change-time across all vault facts (incl. deleted/superseded) at
synthesis time. Delta refresh regenerates only sections whose source facts
changed since a previous doc's watermark.

***

### version

> **version**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#231)

[PROFILE\_DOC\_VERSION](../variables/PROFILE_DOC_VERSION.md) at synthesis time.
