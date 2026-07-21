# ProfileDoc

Defined in: [src/lib/memory/synthesizeProfile.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#147)

A synthesized profile. Server-authoritative once published; the client
caches it and passes it back as [SynthesizeProfileOptions.previous](SynthesizeProfileOptions.md#previous).

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#157)

Unix ms this doc was produced.

***

### sections

> **sections**: [`ProfileSection`](ProfileSection.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#151)

One section per requested facet (in facet order).

***

### vaultWatermark

> **vaultWatermark**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#155)

Max change-time across all vault facts (incl. deleted/superseded) at
synthesis time. Delta refresh regenerates only sections whose source facts
changed since a previous doc's watermark.

***

### version

> **version**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#149)

[PROFILE\_DOC\_VERSION](../variables/PROFILE_DOC_VERSION.md) at synthesis time.
