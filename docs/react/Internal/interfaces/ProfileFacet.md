# ProfileFacet

Defined in: [src/lib/memory/synthesizeProfile.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#75)

One profile facet: how to recall its evidence and steer its synthesis.

## Properties

### guidance

> **guidance**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#82)

Facet-specific guidance appended to the synthesis system prompt.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#76)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#78)

Human-readable section label.

***

### query

> **query**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#80)

Recall query that pulls the vault facts relevant to this facet.
