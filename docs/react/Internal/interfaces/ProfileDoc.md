# ProfileDoc

Defined in: [src/lib/memory/synthesizeProfile.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#172)

A synthesized profile. Server-authoritative once published; the client
caches it and passes it back as [SynthesizeProfileOptions.previous](SynthesizeProfileOptions.md#previous).

## Properties

### config

> **config**: [`ProfileConfigFingerprint`](ProfileConfigFingerprint.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#182)

The config that produced this doc — see [ProfileConfigFingerprint](ProfileConfigFingerprint.md).

***

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#184)

Unix ms this doc was produced.

***

### sections

> **sections**: [`ProfileSection`](ProfileSection.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#176)

One section per requested facet (in facet order).

***

### vaultWatermark

> **vaultWatermark**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#180)

Max change-time across all vault facts (incl. deleted/superseded) at
synthesis time. Delta refresh regenerates only sections whose source facts
changed since a previous doc's watermark.

***

### version

> **version**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#174)

[PROFILE\_DOC\_VERSION](../variables/PROFILE_DOC_VERSION.md) at synthesis time.
