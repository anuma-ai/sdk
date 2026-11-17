# ProfileFacet

Defined in: [src/lib/memory/synthesizeProfile.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#47)

One profile facet: how to recall its evidence and steer its synthesis.

## Properties

### guidance

> **guidance**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#54)

Facet-specific guidance appended to the synthesis system prompt.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#48)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#50)

Human-readable section label.

***

### query

> **query**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#52)

Recall query that pulls the vault facts relevant to this facet.
