# ProfileDoc

Defined in: [src/lib/memory/synthesizeProfile.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#180)

A synthesized profile. Server-authoritative once published; the client
caches it and passes it back as [SynthesizeProfileOptions.previous](SynthesizeProfileOptions.md#previous).

## Properties

### config

> **config**: [`ProfileConfigFingerprint`](ProfileConfigFingerprint.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#190)

The config that produced this doc — see [ProfileConfigFingerprint](ProfileConfigFingerprint.md).

***

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#198)

Unix ms this doc was produced.

***

### observationTrends

> **observationTrends**: `Record`<[`ObservationTrend`](../type-aliases/ObservationTrend.md), `number`>

Defined in: [src/lib/memory/synthesizeProfile.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#196)

C2 — counts of observation-trend labels over live vault facts at
synthesis time. Lets People Nearby surface "interests trending up"
without another LLM pass. Recomputed every synthesis (not delta-cached).

***

### sections

> **sections**: [`ProfileSection`](ProfileSection.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#184)

One section per requested facet (in facet order).

***

### vaultWatermark

> **vaultWatermark**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#188)

Max change-time across all vault facts (incl. deleted/superseded) at
synthesis time. Delta refresh regenerates only sections whose source facts
changed since a previous doc's watermark.

***

### version

> **version**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#182)

[PROFILE\_DOC\_VERSION](../variables/PROFILE_DOC_VERSION.md) at synthesis time.
