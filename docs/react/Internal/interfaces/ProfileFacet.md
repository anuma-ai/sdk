# ProfileFacet

Defined in: [src/lib/memory/synthesizeProfile.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#49)

One profile facet: how to recall its evidence and steer its synthesis.

## Properties

### guidance

> **guidance**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#56)

Facet-specific guidance appended to the synthesis system prompt.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#50)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#52)

Human-readable section label.

***

### query

> **query**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#54)

Recall query that pulls the vault facts relevant to this facet.
