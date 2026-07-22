# ProfileDoc

Defined in: [src/lib/memory/synthesizeProfile.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#179)

A synthesized profile. Server-authoritative once published; the client
caches it and passes it back as [SynthesizeProfileOptions.previous](SynthesizeProfileOptions.md#previous).

## Properties

### config

> **config**: [`ProfileConfigFingerprint`](ProfileConfigFingerprint.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#189)

The config that produced this doc — see [ProfileConfigFingerprint](ProfileConfigFingerprint.md).

***

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#191)

Unix ms this doc was produced.

***

### sections

> **sections**: [`ProfileSection`](ProfileSection.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#183)

One section per requested facet (in facet order).

***

### vaultWatermark

> **vaultWatermark**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#187)

Max change-time across all vault facts (incl. deleted/superseded) at
synthesis time. Delta refresh regenerates only sections whose source facts
changed since a previous doc's watermark.

***

### version

> **version**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#181)

[PROFILE\_DOC\_VERSION](../variables/PROFILE_DOC_VERSION.md) at synthesis time.
