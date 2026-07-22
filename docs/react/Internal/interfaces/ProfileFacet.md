# ProfileFacet

Defined in: [src/lib/memory/synthesizeProfile.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#67)

One profile facet: how to recall its evidence and steer its synthesis.

## Properties

### guidance

> **guidance**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#74)

Facet-specific guidance appended to the synthesis system prompt.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#68)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#70)

Human-readable section label.

***

### query

> **query**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#72)

Recall query that pulls the vault facts relevant to this facet.
